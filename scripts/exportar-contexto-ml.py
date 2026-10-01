#!/usr/bin/env python3

import argparse
import csv
import io
import json
import os
import random
import re
import shutil
import subprocess
import sys
import threading
import time
import unicodedata
from collections import defaultdict
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent


def load_dotenv(root: Path) -> None:
    env_path = root / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, sep, value = stripped.partition("=")
        if not sep:
            continue
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


load_dotenv(ROOT)


def load_official_page_url(root: Path) -> str:
    site_data = json.loads((root / "src/data/site.json").read_text(encoding="utf-8"))
    return site_data["mercadolibre"]["paginaOficial"]


ML_API_BASE = "https://api.mercadolibre.com"
TARGET_ML_USER_ID = os.environ.get("AGAS_ML_USER_ID", "3016787556")
if not TARGET_ML_USER_ID.isdigit():
    sys.exit(f"AGAS_ML_USER_ID debe ser un ID numérico, se recibió: {TARGET_ML_USER_ID!r}")
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
RETRY_BASE_DELAY_SECONDS = 0.3
RETRY_JITTER_SECONDS = 0.3
API_POOL_WORKERS = 4
IMAGE_POOL_WORKERS = 8
DEFAULT_OUTPUT = str((ROOT / os.environ.get("AGAS_CONTEXT_DIR", "../agas-context")).resolve())
REVIEWS_PAGE_LIMIT = 50
OFFICIAL_PAGE_URL = load_official_page_url(ROOT)
PG_CONTAINER = os.environ.get("AGAS_PG_CONTAINER", "pg-dev")
PG_USER = os.environ.get("AGAS_PG_USER", "agas")
PG_DB = os.environ.get("AGAS_PG_DB", "mi_app_ml")

_thread_local = threading.local()


def get_api_session(access_token: str) -> requests.Session:
    session = getattr(_thread_local, "api_session", None)
    if session is None:
        session = requests.Session()
        session.headers["Authorization"] = f"Bearer {access_token}"
        _thread_local.api_session = session
    return session


def get_image_session() -> requests.Session:
    session = getattr(_thread_local, "image_session", None)
    if session is None:
        session = requests.Session()
        _thread_local.image_session = session
    return session


def run_psql(sql: str) -> list[dict[str, str]]:
    try:
        result = subprocess.run(
            ["docker", "exec", PG_CONTAINER, "psql", "-U", PG_USER, "-d", PG_DB, "--csv", "-c", sql],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        sys.exit(f"Database container {PG_CONTAINER} is not running: {exc}")
    if result.returncode != 0:
        sys.exit(
            f"Database container {PG_CONTAINER} is not running or the query failed:\n"
            f"{result.stderr.strip()}"
        )
    return list(csv.DictReader(io.StringIO(result.stdout)))


def load_account() -> dict[str, str]:
    rows = run_psql(
        "SELECT id, ml_user_id, nickname, access_token, token_expires_at FROM ml_account "
        f"WHERE ml_user_id = {TARGET_ML_USER_ID}"
    )
    if not rows:
        sys.exit(f"No ml_account row found for ml_user_id={TARGET_ML_USER_ID}")
    return rows[0]


def ensure_token_is_valid(account: dict[str, str]) -> None:
    expires_at = datetime.fromisoformat(account["token_expires_at"])
    if expires_at <= datetime.now(timezone.utc):
        sys.exit(
            "Access token for the Agas account expired at "
            f"{account['token_expires_at']} — refresh it from the app before running this script."
        )


def load_listings(account_id: str) -> list[dict[str, str]]:
    return run_psql(
        "SELECT id, ml_item_id, title, status, price, has_variations, permalink, thumbnail_url, "
        "available_quantity, sold_quantity, seller_sku, user_product_id, family_name, "
        f"catalog_listing FROM listing WHERE account_id = {account_id} ORDER BY id"
    )


def load_listing_by_ml_item_id(account_id: str, ml_item_id: str) -> dict[str, str] | None:
    escaped = ml_item_id.replace("'", "''")
    rows = run_psql(
        "SELECT id, ml_item_id, title, status, price, has_variations, permalink, thumbnail_url, "
        "available_quantity, sold_quantity, seller_sku, user_product_id, family_name, "
        f"catalog_listing FROM listing WHERE account_id = {account_id} AND ml_item_id = '{escaped}'"
    )
    return rows[0] if rows else None


def load_variations(listing_ids: list[str]) -> dict[str, list[dict[str, str]]]:
    ids = [str(listing_id) for listing_id in listing_ids if listing_id]
    if not ids:
        return {}
    ids_sql = ",".join(ids)
    rows = run_psql(
        "SELECT listing_id, ml_variation_id, attribute_summary, price, available_quantity, seller_sku "
        f"FROM listing_variation WHERE listing_id IN ({ids_sql}) ORDER BY listing_id, ml_variation_id"
    )
    by_listing = defaultdict(list)
    for row in rows:
        by_listing[row["listing_id"]].append(row)
    return by_listing


def load_families(account_id: str) -> tuple[list[dict[str, str]], dict[str, list[str]]]:
    families = run_psql(
        f"SELECT id, name FROM virtual_family WHERE account_id = {account_id} ORDER BY id"
    )
    member_rows = run_psql(
        "SELECT vfm.virtual_family_id AS family_id, vfm.listing_id AS listing_id "
        "FROM virtual_family_member vfm JOIN virtual_family vf ON vf.id = vfm.virtual_family_id "
        f"WHERE vf.account_id = {account_id}"
    )
    members_by_family = defaultdict(list)
    for row in member_rows:
        members_by_family[row["family_id"]].append(row["listing_id"])
    return families, members_by_family


def compute_backoff_seconds(attempt: int, retry_after: float | None) -> float:
    backoff = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, RETRY_JITTER_SECONDS)
    if retry_after is not None:
        return max(backoff, retry_after)
    return backoff


def get_with_retry(
    session: requests.Session, url: str, params: dict[str, str] | None = None
) -> requests.Response:
    response = None
    last_exception = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as exc:
            last_exception = exc
            response = None
        if response is not None and response.status_code not in RETRYABLE_STATUS:
            return response
        if attempt < MAX_RETRIES:
            retry_after = to_float(response.headers.get("Retry-After")) if response is not None else None
            time.sleep(compute_backoff_seconds(attempt, retry_after))
    if response is not None:
        return response
    raise RuntimeError(f"GET {url} failed after {MAX_RETRIES} attempts: {last_exception}")


def ml_get(access_token: str, path: str, params: dict[str, str] | None = None) -> requests.Response:
    session = get_api_session(access_token)
    return get_with_retry(session, f"{ML_API_BASE}{path}", params=params)


def fetch_reviews(access_token: str, ml_item_id: str) -> tuple[dict | None, list[str]]:
    errors: list[str] = []
    reviews: list[dict] = []
    paging: dict = {}
    rating_average = None
    rating_levels: dict = {}
    offset = 0
    while True:
        try:
            response = ml_get(
                access_token,
                f"/reviews/item/{ml_item_id}",
                params={"limit": REVIEWS_PAGE_LIMIT, "offset": offset},
            )
        except RuntimeError as exc:
            errors.append(f"GET reviews for {ml_item_id} failed: {exc}")
            return None, errors
        if response.status_code != 200:
            if not (400 <= response.status_code < 500):
                errors.append(f"GET reviews for {ml_item_id} returned HTTP {response.status_code}")
            return None, errors
        data = response.json()
        paging = data.get("paging") or {}
        rating_average = data.get("rating_average")
        rating_levels = data.get("rating_levels") or {}
        page_reviews = data.get("reviews") or []
        reviews.extend(page_reviews)
        total_pageable = to_int(paging.get("total_pageable")) or 0
        offset += REVIEWS_PAGE_LIMIT
        if not page_reviews or len(reviews) >= total_pageable or len(page_reviews) < REVIEWS_PAGE_LIMIT:
            break
    return (
        {
            "rating_average": rating_average,
            "total": to_int(paging.get("total")) or 0,
            "reviews_with_comment": to_int(paging.get("reviews_with_comment")) or 0,
            "rating_levels": rating_levels,
            "reviews": reviews,
        },
        errors,
    )


def fetch_item_bundle(
    access_token: str, ml_item_id: str
) -> tuple[dict | None, str | None, list, dict | None, list[str]]:
    errors: list[str] = []
    try:
        item_response = ml_get(access_token, f"/items/{ml_item_id}")
    except RuntimeError as exc:
        return None, None, [], None, [str(exc)]
    if item_response.status_code != 200:
        return None, None, [], None, [f"GET /items/{ml_item_id} returned HTTP {item_response.status_code}"]
    item = item_response.json()

    description = None
    try:
        description_response = ml_get(access_token, f"/items/{ml_item_id}/description")
        if description_response.status_code == 200:
            description = description_response.json().get("plain_text")
        elif description_response.status_code != 404:
            errors.append(
                f"GET description for {ml_item_id} returned HTTP {description_response.status_code}"
            )
    except RuntimeError as exc:
        errors.append(f"GET description for {ml_item_id} failed: {exc}")

    promotions: list = []
    try:
        promotions_response = ml_get(
            access_token, f"/seller-promotions/items/{ml_item_id}", params={"app_version": "v2"}
        )
        if promotions_response.status_code == 200:
            promotions = promotions_response.json()
        elif not (400 <= promotions_response.status_code < 500):
            errors.append(
                f"GET seller-promotions for {ml_item_id} returned HTTP {promotions_response.status_code}"
            )
    except RuntimeError as exc:
        errors.append(f"GET seller-promotions for {ml_item_id} failed: {exc}")

    reviews_result, reviews_errors = fetch_reviews(access_token, ml_item_id)
    errors.extend(reviews_errors)

    return item, description, promotions, reviews_result, errors


def slugify(text: str | None, max_length: int = 40) -> str:
    normalized = unicodedata.normalize("NFKD", text or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    ascii_text = re.sub(r"-{2,}", "-", ascii_text)
    truncated = ascii_text[:max_length].strip("-")
    return truncated or "item"


def family_folder_slug(family: dict[str, str]) -> str:
    return f"familia-{slugify(family['name'])}"


def standalone_folder_slug(ml_item_id: str, title: object) -> str:
    return f"{ml_item_id}-{slugify(title or ml_item_id)}"


def sanitize_filename_part(value: object) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value))


def md_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def pick(db_value: object, api_value: object, default: object = "-") -> object:
    if db_value not in (None, ""):
        return db_value
    if api_value not in (None, ""):
        return api_value
    return default


def to_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def to_int(value: object) -> int | None:
    parsed = to_float(value)
    return int(parsed) if parsed is not None else None


def format_price(value: float | None) -> str:
    if value is None:
        return "-"
    return f"${value:,.0f}".replace(",", ".")


def format_price_range(values: list[float | None]) -> str:
    clean = [value for value in values if value is not None]
    if not clean:
        return "-"
    low, high = min(clean), max(clean)
    if low == high:
        return format_price(low)
    return f"{format_price(low)} - {format_price(high)}"


def format_family_info(family_name: object, user_product_id: object) -> str:
    if not family_name or family_name == "-":
        return "-"
    if user_product_id and user_product_id != "-":
        return f"{family_name} (user_product_id {user_product_id})"
    return str(family_name)


def bool_field(db_value: object, api_value: object) -> bool:
    if db_value in ("t", "f"):
        return db_value == "t"
    if isinstance(api_value, bool):
        return api_value
    return False


def extract_video_reference(item: dict) -> str | None:
    video_id = item.get("video_id")
    if video_id in (None, "", "null"):
        return None
    return str(video_id)


def assign_pictures(item: dict) -> tuple[list[dict], dict[object, list[dict]]]:
    pictures = item.get("pictures") or []
    variations = item.get("variations") or []
    pictures_by_id = {picture.get("id"): picture for picture in pictures}
    referenced_ids: set = set()
    for variation in variations:
        referenced_ids.update(variation.get("picture_ids") or [])
    item_pictures = [picture for picture in pictures if picture.get("id") not in referenced_ids]
    variation_pictures = {}
    for variation in variations:
        variation_pictures[variation.get("id")] = [
            pictures_by_id[picture_id]
            for picture_id in (variation.get("picture_ids") or [])
            if picture_id in pictures_by_id
        ]
    return item_pictures, variation_pictures


def variant_label(db_variation: dict[str, str] | None, api_variation: dict) -> str:
    if db_variation and db_variation.get("attribute_summary"):
        return db_variation["attribute_summary"]
    combos = api_variation.get("attribute_combinations") or []
    combined = ", ".join(
        f"{combo.get('name')}: {combo.get('value_name')}" for combo in combos if combo.get("name")
    )
    return combined or f"Variante {api_variation.get('id')}"


def render_description_text(description: str | None) -> str:
    if description is None:
        return "Sin descripción."
    text = description.strip()
    return text if text else "Sin descripción."


def render_promotions_text(promotions: list, generated_date: str) -> str:
    if not promotions:
        return f"Sin promociones vigentes al {generated_date}."
    lines = []
    for promo in promotions:
        promo_type = promo.get("type", "PROMO")
        promo_id = promo.get("id", "-")
        status = promo.get("status", "-")
        lines.append(f"- **{promo_type}** (`{promo_id}`) — estado: {status}")
        for key in sorted(k for k in promo if k not in {"type", "id", "status"}):
            lines.append(f"  - {key}: {promo[key]}")
    return "\n".join(lines)


def format_rating(value: object) -> str:
    if value is None:
        return "-"
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return "-"


def format_short_date(value: object) -> str:
    if not value:
        return "-"
    return str(value).split("T", 1)[0]


def render_review_line(review: dict) -> str:
    rate = to_int(review.get("rate")) or 0
    stars = "★" * rate
    title = review.get("title") or ""
    content = review.get("content") or ""
    date = format_short_date(review.get("date_created"))
    line = f"- {stars} «{title}» — {content} ({date})"
    likes = to_int(review.get("likes")) or 0
    dislikes = to_int(review.get("dislikes")) or 0
    extras = []
    if likes > 0:
        extras.append(f"{likes} likes")
    if dislikes > 0:
        extras.append(f"{dislikes} dislikes")
    if extras:
        line += f" [{', '.join(extras)}]"
    return line


RATING_LEVEL_LABELS = (
    ("five_star", 5),
    ("four_star", 4),
    ("three_star", 3),
    ("two_star", 2),
    ("one_star", 1),
)


def render_reviews_text(reviews_result: dict | None) -> str:
    if reviews_result is None:
        return "Sin datos de reviews."
    total = reviews_result["total"]
    if total <= 0:
        return "Sin reviews aún."
    lines = [
        f"{format_rating(reviews_result['rating_average'])}★ — {total} reviews, "
        f"{reviews_result['reviews_with_comment']} con comentario",
        "",
    ]
    for key, stars in RATING_LEVEL_LABELS:
        count = to_int(reviews_result["rating_levels"].get(key)) or 0
        if count > 0:
            lines.append(f"- {stars}★: {count}")
    if reviews_result["reviews"]:
        lines.append("")
        for review in reviews_result["reviews"]:
            lines.append(render_review_line(review))
    return "\n".join(lines)


def format_reviews_summary(reviews_result: dict | None) -> str:
    if not reviews_result or reviews_result["total"] <= 0:
        return "-"
    return f"{format_rating(reviews_result['rating_average'])}★ ({reviews_result['total']})"


def render_image_list_md(files: list[str], dir_relative: str) -> list[str]:
    if not files:
        return ["_Sin imágenes._"]
    return [f"- {dir_relative}{name}" for name in files]


def render_variants_table_md(variants: list["VariantView"], prefix: str) -> str:
    lines = ["| Atributos | Precio | Stock | SKU | Carpeta de imágenes |", "|---|---|---|---|---|"]
    for variant in variants:
        folder = f"{prefix}{variant.images_dir_relative}"
        lines.append(
            f"| {md_cell(variant.label)} | {md_cell(variant.price)} | {md_cell(variant.stock)} | "
            f"{md_cell(variant.sku)} | {md_cell(folder)} |"
        )
    return "\n".join(lines)


def render_item_body_md(view: "ItemView", prefix: str) -> str:
    price_line = f"- **Precio:** {view.price}"
    if view.original_price and view.original_price != view.price:
        price_line += f" (precio original {view.original_price})"

    lines = [
        f"- **ML Item ID:** {view.ml_item_id}",
        f"- **Link:** {view.permalink}",
        f"- **Estado:** {view.status}",
        f"- **Condición:** {view.condition}",
        f"- **Catálogo:** {'Sí' if view.catalog_listing else 'No'}",
        f"- **Familia ML:** {view.family_info}",
        price_line,
        f"- **Stock disponible:** {view.available_quantity}",
        f"- **Vendidos:** {view.sold_quantity}",
        f"- **SKU:** {view.sku}",
        "",
        "### Descripción",
        "",
        view.description_text,
        "",
        "### Promociones y cupones",
        "",
        view.promotions_text,
        "",
        "### Reviews",
        "",
        view.reviews_text,
        "",
    ]

    if view.variants:
        lines += ["### Variantes", "", render_variants_table_md(view.variants, prefix), ""]
        lines.append("### Imágenes por variante")
        lines.append("")
        for variant in view.variants:
            lines.append(f"**{variant.label}**")
            lines.append("")
            lines += render_image_list_md(variant.image_files, f"{prefix}{variant.images_dir_relative}")
            lines.append("")
        lines.append("### Imágenes sin variante asignada")
        lines.append("")
        lines += render_image_list_md(view.item_image_files, f"{prefix}{view.item_images_dir_relative}")
    else:
        lines.append("### Imágenes")
        lines.append("")
        lines += render_image_list_md(view.item_image_files, f"{prefix}{view.item_images_dir_relative}")

    lines.append("")
    lines.append("### Videos")
    lines.append("")
    if view.video_reference:
        lines.append(f"- Referencia externa (video_id): {view.video_reference}")
    else:
        lines.append("_Sin videos._")

    return "\n".join(lines)


@dataclass
class SweepStats:
    items_processed: int = 0
    families_processed: int = 0
    images_downloaded: int = 0
    images_skipped: int = 0
    videos_found: int = 0
    videos_referenced: int = 0
    active: int = 0
    paused: int = 0
    under_review: int = 0
    other_status: int = 0
    with_variations: int = 0
    without_variations: int = 0
    obsolete_removed: int = 0
    errors: list[str] = field(default_factory=list)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def record_error(self, message: str) -> None:
        with self.lock:
            self.errors.append(message)

    def record_obsolete(self) -> None:
        with self.lock:
            self.obsolete_removed += 1

    def record_image_outcome(self, outcome: str) -> None:
        with self.lock:
            if outcome == "downloaded":
                self.images_downloaded += 1
            else:
                self.images_skipped += 1

    def record_video_reference(self, exported: bool) -> None:
        with self.lock:
            self.videos_found += 1
            if exported:
                self.videos_referenced += 1

    def record_item(self, status_key: str, has_variants: bool) -> None:
        with self.lock:
            if status_key == "active":
                self.active += 1
            elif status_key == "paused":
                self.paused += 1
            elif status_key == "under_review":
                self.under_review += 1
            else:
                self.other_status += 1
            if has_variants:
                self.with_variations += 1
            else:
                self.without_variations += 1
            self.items_processed += 1

    def record_family(self) -> None:
        with self.lock:
            self.families_processed += 1


@dataclass
class VariantView:
    label: str
    slug: str
    price: str
    stock: str
    sku: str
    images_dir_relative: str
    image_files: list[str]


@dataclass
class ItemView:
    ml_item_id: str
    title: str
    permalink: str
    status: str
    condition: str
    catalog_listing: bool
    family_info: str
    price: str
    price_raw: float | None
    original_price: str | None
    available_quantity: str
    stock_raw: int | None
    sold_quantity: str
    sku: str
    description_text: str
    promotions_text: str
    reviews_text: str
    reviews_summary: str
    variants: list[VariantView]
    item_image_files: list[str]
    item_images_dir_relative: str
    video_reference: str | None
    folder_slug: str = ""


@dataclass
class IndexRow:
    title: str
    kind: str
    link: str
    price: str
    stock: str
    status: str
    path: str
    reviews: str = "-"
    indent: bool = False


def download_image(url: str, dest_path: Path, force_images: bool) -> str:
    if dest_path.exists() and not force_images:
        return "skipped"
    session = get_image_session()
    response = get_with_retry(session, url)
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code}")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_name(dest_path.name + f".{threading.get_ident()}.tmp")
    temp_path.write_bytes(response.content)
    temp_path.replace(dest_path)
    return "downloaded"


def download_pictures(
    image_pool: ThreadPoolExecutor,
    pictures: list[dict],
    dest_dir: Path,
    args: argparse.Namespace,
    stats: SweepStats,
) -> list[str]:
    if args.skip_images or not pictures:
        return []
    tasks: list[tuple[str, str, str, Future]] = []
    for index, picture in enumerate(pictures, start=1):
        url = picture.get("secure_url") or picture.get("url")
        picture_id = picture.get("id") or str(index)
        if not url:
            stats.record_error(f"picture {picture_id} has no downloadable URL")
            continue
        filename = f"{index:02d}-{sanitize_filename_part(picture_id)}.jpg"
        dest_path = dest_dir / filename
        future = image_pool.submit(download_image, url, dest_path, args.force_images)
        tasks.append((filename, picture_id, url, future))

    filenames = []
    for filename, picture_id, url, future in tasks:
        try:
            outcome = future.result()
        except RuntimeError as exc:
            stats.record_error(f"image {picture_id} at {url}: {exc}")
            continue
        stats.record_image_outcome(outcome)
        filenames.append(filename)
    return filenames


def build_item_view(
    image_pool: ThreadPoolExecutor,
    ml_item_id: str,
    db_row: dict[str, str] | None,
    db_variations: list[dict[str, str]],
    dest_dir: Path,
    args: argparse.Namespace,
    stats: SweepStats,
    generated_date: str,
    item: dict | None,
    description: str | None,
    promotions: list,
    reviews_result: dict | None,
    fetch_errors: list[str],
) -> ItemView | None:
    for message in fetch_errors:
        stats.record_error(f"{ml_item_id}: {message}")
    if item is None:
        stats.record_error(f"{ml_item_id}: could not fetch item detail from the ML API, skipped")
        return None

    db_row = db_row or {}
    title = pick(db_row.get("title"), item.get("title"), ml_item_id)
    status = pick(db_row.get("status"), item.get("status"))
    permalink = pick(db_row.get("permalink"), item.get("permalink"))
    catalog_listing = bool_field(db_row.get("catalog_listing"), item.get("catalog_listing"))
    family_name = pick(db_row.get("family_name"), item.get("family_name"))
    user_product_id = pick(db_row.get("user_product_id"), item.get("user_product_id"))
    family_info = format_family_info(family_name, user_product_id)

    price_raw = to_float(pick(db_row.get("price"), item.get("price"), None))
    price = format_price(price_raw)
    original_price_raw = to_float(item.get("original_price"))
    original_price = format_price(original_price_raw) if original_price_raw is not None else None

    stock_raw = to_int(pick(db_row.get("available_quantity"), item.get("available_quantity"), None))
    available_quantity = str(stock_raw) if stock_raw is not None else "-"
    sold_raw = to_int(pick(db_row.get("sold_quantity"), item.get("sold_quantity"), None))
    sold_quantity = str(sold_raw) if sold_raw is not None else "-"
    sku = pick(db_row.get("seller_sku"), item.get("seller_custom_field"))
    condition = item.get("condition") or "-"

    description_text = render_description_text(description)
    promotions_text = render_promotions_text(promotions, generated_date)
    reviews_text = render_reviews_text(reviews_result)
    reviews_summary = format_reviews_summary(reviews_result)

    item_pictures, variation_pictures = assign_pictures(item)
    db_variations_by_ml_id = {row["ml_variation_id"]: row for row in db_variations}

    variants = []
    for api_variation in item.get("variations") or []:
        api_variation_id = api_variation.get("id")
        db_variation = db_variations_by_ml_id.get(str(api_variation_id))
        label = variant_label(db_variation, api_variation)
        variant_slug = f"variante-{slugify(label)}-{api_variation_id}"
        pictures = variation_pictures.get(api_variation_id, [])
        image_files = download_pictures(
            image_pool, pictures, dest_dir / variant_slug / "imagenes", args, stats
        )
        variant_price = format_price(
            to_float(pick(db_variation.get("price") if db_variation else None, api_variation.get("price"), None))
        )
        variant_stock_raw = to_int(
            pick(
                db_variation.get("available_quantity") if db_variation else None,
                api_variation.get("available_quantity"),
                None,
            )
        )
        variant_sku = (db_variation.get("seller_sku") if db_variation else None) or "-"
        variants.append(
            VariantView(
                label=label,
                slug=variant_slug,
                price=variant_price,
                stock=str(variant_stock_raw) if variant_stock_raw is not None else "-",
                sku=variant_sku,
                images_dir_relative=f"{variant_slug}/imagenes/",
                image_files=image_files,
            )
        )

    item_image_files = download_pictures(image_pool, item_pictures, dest_dir / "imagenes", args, stats)

    video_reference = extract_video_reference(item)
    if video_reference is not None:
        exported = not args.skip_videos
        stats.record_video_reference(exported)
        if not exported:
            video_reference = None

    stats.record_item((status or "").lower(), bool(variants))

    return ItemView(
        ml_item_id=ml_item_id,
        title=title,
        permalink=permalink,
        status=status,
        condition=condition,
        catalog_listing=catalog_listing,
        family_info=family_info,
        price=price,
        price_raw=price_raw,
        original_price=original_price,
        available_quantity=available_quantity,
        stock_raw=stock_raw,
        sold_quantity=sold_quantity,
        sku=sku,
        description_text=description_text,
        promotions_text=promotions_text,
        reviews_text=reviews_text,
        reviews_summary=reviews_summary,
        variants=variants,
        item_image_files=item_image_files,
        item_images_dir_relative="imagenes/",
        video_reference=video_reference,
    )


def write_standalone_publicacion_md(item_dir: Path, view: ItemView) -> None:
    lines = [f"# {view.title}", "", render_item_body_md(view, prefix="")]
    (item_dir / "publicacion.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_family_publicacion_md(family_dir: Path, family_name: str, member_views: list[ItemView]) -> None:
    lines = [f"# Familia: {family_name}", ""]
    if member_views:
        prices = [view.price_raw for view in member_views]
        stocks = [view.stock_raw for view in member_views if view.stock_raw is not None]
        lines += [
            f"- **Miembros:** {len(member_views)}",
            f"- **Rango de precios:** {format_price_range(prices)}",
            f"- **Stock total:** {sum(stocks) if stocks else 0}",
            "",
        ]
    else:
        lines += ["_Sin miembros procesados correctamente._", ""]

    for view in member_views:
        lines.append(f"## {view.title}")
        lines.append("")
        lines.append(render_item_body_md(view, prefix=f"{view.folder_slug}/"))
        lines.append("")

    (family_dir / "publicacion.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def process_standalone_batch(
    access_token: str,
    api_pool: ThreadPoolExecutor,
    image_pool: ThreadPoolExecutor,
    id_and_rows: list[tuple[str, dict[str, str] | None, list[dict[str, str]]]],
    publications_root: Path,
    args: argparse.Namespace,
    stats: SweepStats,
    generated_date: str,
) -> list[IndexRow]:
    futures = [
        api_pool.submit(fetch_item_bundle, access_token, ml_item_id) for ml_item_id, _, _ in id_and_rows
    ]

    rows: list[IndexRow] = []
    for (ml_item_id, listing_row, db_variations), future in zip(id_and_rows, futures):
        folder_slug = standalone_folder_slug(ml_item_id, (listing_row or {}).get("title"))
        item_dir = publications_root / folder_slug
        item_dir.mkdir(parents=True, exist_ok=True)

        item, description, promotions, reviews_result, fetch_errors = future.result()
        view = build_item_view(
            image_pool, ml_item_id, listing_row, db_variations, item_dir, args, stats, generated_date,
            item, description, promotions, reviews_result, fetch_errors,
        )
        if view is None:
            continue

        write_standalone_publicacion_md(item_dir, view)
        kind = "variantes" if view.variants else "simple"
        rows.append(
            IndexRow(
                title=view.title,
                kind=kind,
                link=view.permalink,
                price=view.price,
                stock=view.available_quantity,
                status=view.status,
                path=f"publicaciones/{folder_slug}/",
                reviews=view.reviews_summary,
            )
        )
    return rows


def process_family(
    access_token: str,
    api_pool: ThreadPoolExecutor,
    image_pool: ThreadPoolExecutor,
    family: dict[str, str],
    member_listing_rows: list[dict[str, str]],
    variations_by_listing: dict[str, list[dict[str, str]]],
    publications_root: Path,
    args: argparse.Namespace,
    stats: SweepStats,
    generated_date: str,
) -> list[IndexRow]:
    family_slug = family_folder_slug(family)
    family_dir = publications_root / family_slug
    family_dir.mkdir(parents=True, exist_ok=True)

    futures = [
        api_pool.submit(fetch_item_bundle, access_token, listing_row["ml_item_id"])
        for listing_row in member_listing_rows
    ]

    member_views = []
    for listing_row, future in zip(member_listing_rows, futures):
        ml_item_id = listing_row["ml_item_id"]
        member_slug = standalone_folder_slug(ml_item_id, listing_row.get("title"))
        member_dir = family_dir / member_slug
        db_variations = variations_by_listing.get(listing_row["id"], [])
        item, description, promotions, reviews_result, fetch_errors = future.result()
        view = build_item_view(
            image_pool, ml_item_id, listing_row, db_variations, member_dir, args, stats, generated_date,
            item, description, promotions, reviews_result, fetch_errors,
        )
        if view is None:
            continue
        view.folder_slug = member_slug
        member_views.append(view)

    stats.record_family()
    write_family_publicacion_md(family_dir, family["name"], member_views)

    rows = [
        IndexRow(
            title=family["name"],
            kind="familia",
            link="(ver miembros)",
            price=format_price_range([view.price_raw for view in member_views]),
            stock=str(sum(view.stock_raw for view in member_views if view.stock_raw is not None)),
            status="-",
            path=f"publicaciones/{family_slug}/",
        )
    ]
    for view in member_views:
        rows.append(
            IndexRow(
                title=view.title,
                kind=f"miembro de «{family['name']}»",
                link=view.permalink,
                price=view.price,
                stock=view.available_quantity,
                status=view.status,
                path=f"publicaciones/{family_slug}/{view.folder_slug}/",
                reviews=view.reviews_summary,
                indent=True,
            )
        )
    return rows


def prune_skip_reason(listings: list[dict[str, str]], errors: list[str]) -> str | None:
    if not listings:
        return "Listado de publicaciones vacío: se omite la poda de carpetas obsoletas."
    if errors:
        return (
            f"Se registraron {len(errors)} errores durante el barrido: "
            "se omite la poda de carpetas obsoletas."
        )
    return None


def prune_obsolete_folders(publications_root: Path, protected_folders: set[str], stats: SweepStats) -> None:
    for entry in sorted(publications_root.iterdir()):
        if entry.is_dir() and entry.name not in protected_folders:
            shutil.rmtree(entry)
            print(f"Carpeta obsoleta eliminada: {entry.name}")
            stats.record_obsolete()


def run_full_sweep(
    account: dict[str, str],
    access_token: str,
    api_pool: ThreadPoolExecutor,
    image_pool: ThreadPoolExecutor,
    publications_root: Path,
    args: argparse.Namespace,
    stats: SweepStats,
    generated_date: str,
) -> list[IndexRow]:
    account_id = account["id"]
    listings = load_listings(account_id)
    families, members_by_family = load_families(account_id)

    listing_ids = [row["id"] for row in listings]
    variations_by_listing = load_variations(listing_ids)

    listings_by_id = {row["id"]: row for row in listings}
    member_listing_ids = {
        listing_id for ids in members_by_family.values() for listing_id in ids
    }
    loose_rows = [listing_row for listing_row in listings if listing_row["id"] not in member_listing_ids]

    protected_folders = {family_folder_slug(family) for family in families}
    protected_folders |= {
        standalone_folder_slug(listing_row["ml_item_id"], listing_row.get("title"))
        for listing_row in loose_rows
    }

    rows: list[IndexRow] = []
    for family in families:
        member_rows = [
            listings_by_id[listing_id]
            for listing_id in members_by_family.get(family["id"], [])
            if listing_id in listings_by_id
        ]
        rows += process_family(
            access_token, api_pool, image_pool, family, member_rows, variations_by_listing,
            publications_root, args, stats, generated_date,
        )

    id_and_rows = [
        (listing_row["ml_item_id"], listing_row, variations_by_listing.get(listing_row["id"], []))
        for listing_row in loose_rows
    ]
    rows += process_standalone_batch(
        access_token, api_pool, image_pool, id_and_rows, publications_root, args, stats, generated_date
    )

    skip_reason = prune_skip_reason(listings, stats.errors)
    if skip_reason:
        print(skip_reason)
    else:
        prune_obsolete_folders(publications_root, protected_folders, stats)

    return rows


def run_only_mode(
    account: dict[str, str],
    access_token: str,
    api_pool: ThreadPoolExecutor,
    image_pool: ThreadPoolExecutor,
    publications_root: Path,
    only_ids: list[str],
    args: argparse.Namespace,
    stats: SweepStats,
    generated_date: str,
) -> list[IndexRow]:
    account_id = account["id"]
    id_and_rows = []
    for ml_item_id in only_ids:
        listing_row = load_listing_by_ml_item_id(account_id, ml_item_id)
        db_variations = (
            load_variations([listing_row["id"]]).get(listing_row["id"], []) if listing_row else []
        )
        id_and_rows.append((ml_item_id, listing_row, db_variations))
    return process_standalone_batch(
        access_token, api_pool, image_pool, id_and_rows, publications_root, args, stats, generated_date
    )


def resolve_only_ids(only_args: list[str]) -> list[str]:
    ids = []
    for entry in only_args:
        ids.extend(part.strip() for part in entry.split(",") if part.strip())
    return ids


def write_index_md(output_root: Path, rows: list[IndexRow]) -> None:
    lines = [
        "# Índice de publicaciones",
        "",
        "| Título | Tipo | Link ML | Precio | Stock | Estado | Reviews | Ruta |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        title = f"↳ {row.title}" if row.indent else row.title
        lines.append(
            f"| {md_cell(title)} | {md_cell(row.kind)} | {md_cell(row.link)} | {md_cell(row.price)} | "
            f"{md_cell(row.stock)} | {md_cell(row.status)} | {md_cell(row.reviews)} | {md_cell(row.path)} |"
        )
    (output_root / "indice.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_empresa_md(
    output_root: Path,
    account: dict[str, str],
    access_token: str,
    stats: SweepStats,
    generated_at: str,
) -> None:
    user_data: dict = {}
    try:
        response = ml_get(access_token, f"/users/{account['ml_user_id']}")
        if response.status_code == 200:
            user_data = response.json()
        else:
            stats.record_error(f"GET /users/{account['ml_user_id']} returned HTTP {response.status_code}")
    except RuntimeError as exc:
        stats.record_error(f"GET /users/{account['ml_user_id']} failed: {exc}")

    address = user_data.get("address") or {}
    reputation = user_data.get("seller_reputation") or {}
    transactions = reputation.get("transactions") or {}
    ratings = transactions.get("ratings") or {}

    lines = [
        f"# {user_data.get('nickname') or account['nickname']}",
        "",
        f"- **Seller ID:** {account['ml_user_id']}",
        f"- **Tienda:** {user_data.get('permalink', '-')}",
        f"- **Página oficial:** {OFFICIAL_PAGE_URL}",
        f"- **Ubicación:** {address.get('city', '-')}, {address.get('state', '-')}",
        f"- **Fecha de registro:** {user_data.get('registration_date', '-')}",
        "",
        "## Reputación",
        f"- **Nivel:** {reputation.get('level_id', '-')}",
        f"- **Power seller:** {reputation.get('power_seller_status') or 'No'}",
        f"- **Transacciones totales:** {transactions.get('total', '-')}",
        f"- **Transacciones completadas:** {transactions.get('completed', '-')}",
        f"- **Transacciones canceladas:** {transactions.get('canceled', '-')}",
        f"- **Ratings:** positivos {ratings.get('positive', '-')}, "
        f"neutros {ratings.get('neutral', '-')}, negativos {ratings.get('negative', '-')}",
        "",
        "## Totales del barrido",
        f"- **Publicaciones procesadas:** {stats.items_processed}",
        f"- **Activas:** {stats.active}",
        f"- **Pausadas:** {stats.paused}",
        f"- **En revisión:** {stats.under_review}",
        f"- **Otro estado:** {stats.other_status}",
        f"- **Con variantes:** {stats.with_variations}",
        f"- **Sin variantes:** {stats.without_variations}",
        f"- **Familias:** {stats.families_processed}",
        "",
        f"_Generado el {generated_at}_",
    ]
    (output_root / "empresa.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def print_summary(stats: SweepStats) -> None:
    print("Resumen del barrido")
    print(f"  Publicaciones procesadas: {stats.items_processed}")
    print(f"  Familias: {stats.families_processed}")
    print(f"  Imágenes descargadas: {stats.images_downloaded}")
    print(f"  Imágenes saltadas (ya existían): {stats.images_skipped}")
    print(f"  Videos encontrados: {stats.videos_found}")
    print(f"  Videos exportados como referencia: {stats.videos_referenced}")
    print(f"  Carpetas obsoletas eliminadas: {stats.obsolete_removed}")
    print(f"  Errores: {len(stats.errors)}")
    for error in stats.errors:
        print(f"    - {error}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export Markdown + image context for the Agas Mercado Libre account"
    )
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output directory (default: %(default)s)")
    parser.add_argument("--skip-images", action="store_true", help="Skip all image downloads")
    parser.add_argument("--force-images", action="store_true", help="Re-download images even if they exist")
    parser.add_argument("--skip-videos", action="store_true", help="Skip exporting video references")
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Process only these ML item ids as standalone items (repeatable or CSV)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.skip_images and args.force_images:
        sys.exit("--skip-images and --force-images are mutually exclusive")

    account = load_account()
    ensure_token_is_valid(account)

    output_root = Path(args.output)
    publications_root = output_root / "publicaciones"
    publications_root.mkdir(parents=True, exist_ok=True)

    access_token = account["access_token"]

    stats = SweepStats()
    now = datetime.now()
    generated_date = now.strftime("%Y-%m-%d")
    generated_at = now.strftime("%Y-%m-%d %H:%M:%S")

    only_ids = resolve_only_ids(args.only)

    with ThreadPoolExecutor(max_workers=API_POOL_WORKERS) as api_pool:
        with ThreadPoolExecutor(max_workers=IMAGE_POOL_WORKERS) as image_pool:
            if only_ids:
                rows = run_only_mode(
                    account, access_token, api_pool, image_pool, publications_root, only_ids,
                    args, stats, generated_date,
                )
            else:
                rows = run_full_sweep(
                    account, access_token, api_pool, image_pool, publications_root,
                    args, stats, generated_date,
                )

            write_index_md(output_root, rows)
            write_empresa_md(output_root, account, access_token, stats, generated_at)

    print_summary(stats)


if __name__ == "__main__":
    main()
