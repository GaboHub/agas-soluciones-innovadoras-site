import re

import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Estructura y contrato de salida")]

CUENTA_API = {
    "nickname": "AGAS API",
    "permalink": "https://ml.test/tienda",
    "registration_date": "2020-01-02",
    "address": {"city": "Santiago", "state": "RM"},
    "seller_reputation": {
        "level_id": "5_green",
        "power_seller_status": "gold",
        "transactions": {
            "total": 120,
            "completed": 110,
            "canceled": 10,
            "ratings": {"positive": 0.9, "neutral": 0.05, "negative": 0.05},
        },
    },
}


def test_carpeta_de_publicacion_suelta(esc):
    esc.listings = [fila_listing(1, "MLC1", title="Lámina Vidrio Switch 2")]

    esc.correr()

    assert (esc.salida / "publicaciones/MLC1-lamina-vidrio-switch-2/publicacion.md").is_file()
    assert esc.publicacion("MLC1-lamina-vidrio-switch-2").startswith("# Lámina Vidrio Switch 2\n")


def test_slug_ascii_de_a_lo_mas_40_caracteres(esc):
    titulo = "Ñandú Ábaco " + "x" * 80
    esc.listings = [fila_listing(1, "MLC1", title=titulo)]

    esc.correr()

    (carpeta,) = esc.carpetas()
    slug = carpeta.removeprefix("MLC1-")
    assert slug.isascii() and len(slug) <= 40 and slug.startswith("nandu-abaco-xxx")


def test_precio_original(esc):
    esc.listings = [fila_listing(1, "MLC1", price="1000")]
    esc.responder("/items/MLC1", Respuesta(200, {"id": "MLC1", "original_price": 1500}))

    esc.correr()

    assert "- **Precio:** $1.000 (precio original $1.500)\n" in esc.publicacion("MLC1-titulo-mlc1")


def test_sin_reseñas(esc):
    esc.listings = [fila_listing(1, "MLC1")]
    esc.responder("/reviews/item/MLC1", Respuesta(200, {"paging": {"total": 0}, "reviews": []}))

    esc.correr()

    assert "### Reviews\n\nSin reviews aún.\n" in esc.publicacion("MLC1-titulo-mlc1")


def test_sin_datos_de_reseñas(esc):
    esc.listings = [fila_listing(1, "MLC1")]
    esc.responder("/reviews/item/MLC1", Respuesta(404, {}))

    esc.correr()

    assert "### Reviews\n\nSin datos de reviews.\n" in esc.publicacion("MLC1-titulo-mlc1")


def test_elementos_que_consume_el_generador(esc):
    esc.listings = [
        fila_listing(1, "MLC1", family_name="Linterna", user_product_id="UP1", catalog_listing="t")
    ]
    esc.responder(
        "/items/MLC1", Respuesta(200, {"id": "MLC1", "condition": "new", "original_price": 3000})
    )
    esc.responder("/seller-promotions/items/MLC1", Respuesta(200, []))
    esc.responder(
        "/reviews/item/MLC1",
        Respuesta(
            200,
            {
                "paging": {"total": 3, "total_pageable": 3, "reviews_with_comment": 2},
                "rating_average": 4.333,
                "rating_levels": {"five_star": 2, "four_star": 1},
                "reviews": [
                    {"rate": 5, "title": "Genial", "content": "Muy bueno", "date_created": "2026-03-04T10:00:00Z", "likes": 2, "dislikes": 1},
                    {"rate": 3, "title": "Ok", "content": "Normal", "date_created": "2026-03-05T10:00:00Z"},
                ],
            },
        ),
    )

    esc.correr()

    texto = esc.publicacion("MLC1-titulo-mlc1")
    assert "- **ML Item ID:** MLC1\n" in texto
    assert "- **Link:** https://ml.test/MLC1\n" in texto
    assert "- **Estado:** active\n" in texto
    assert "- **Condición:** new\n" in texto
    assert "- **Catálogo:** Sí\n" in texto
    assert "- **Familia ML:** Linterna (user_product_id UP1)\n" in texto
    assert "- **Precio:** $1.000 (precio original $3.000)\n" in texto
    assert "### Descripción\n\ndescripcion api\n" in texto
    assert "### Promociones y cupones\n\nSin promociones vigentes al " in texto
    assert "4.3★ — 3 reviews, 2 con comentario\n" in texto
    assert "\n- 5★: 2\n- 4★: 1\n" in texto
    assert "- ★★★★★ «Genial» — Muy bueno (2026-03-04) [2 likes, 1 dislikes]\n" in texto
    assert "- ★★★ «Ok» — Normal (2026-03-05)\n" in texto
    assert "### Imágenes\n" in texto


def test_publicacion_con_variantes(esc):
    esc.listings = [fila_listing(1, "MLC1", has_variations="t")]
    esc.variaciones = [
        {
            "listing_id": "1", "ml_variation_id": "V1", "attribute_summary": "Color: Rojo",
            "price": "1200", "available_quantity": "4", "seller_sku": "SKU-ROJO",
        }
    ]
    esc.responder(
        "/items/MLC1",
        Respuesta(
            200,
            {
                "id": "MLC1",
                "pictures": [
                    {"id": "P1", "secure_url": "https://img.test/p1.jpg"},
                    {"id": "P2", "secure_url": "https://img.test/p2.jpg"},
                ],
                "variations": [{"id": "V1", "picture_ids": ["P1"]}],
            },
        ),
    )
    esc.responder("https://img.test/p1.jpg", Respuesta(200))
    esc.responder("https://img.test/p2.jpg", Respuesta(200))

    esc.correr(imagenes=True)

    texto = esc.publicacion("MLC1-titulo-mlc1")
    assert "| Atributos | Precio | Stock | SKU | Carpeta de imágenes |" in texto
    assert "| Color: Rojo | $1.200 | 4 | SKU-ROJO | variante-color-rojo-V1/imagenes/ |" in texto
    assert "### Imágenes por variante\n\n**Color: Rojo**\n\n- variante-color-rojo-V1/imagenes/01-P1.jpg\n" in texto
    assert "### Imágenes sin variante asignada\n\n- imagenes/01-P2.jpg\n" in texto
    base = esc.salida / "publicaciones/MLC1-titulo-mlc1"
    assert (base / "variante-color-rojo-V1/imagenes/01-P1.jpg").is_file()
    assert (base / "imagenes/01-P2.jpg").is_file()


def test_familia_con_sus_miembros(esc):
    esc.listings = [
        fila_listing(1, "MLC1", title="Miembro uno"),
        fila_listing(2, "MLC2", title="Miembro dos"),
    ]
    esc.familias = [{"id": "10", "name": "Linterna Pro"}]
    esc.miembros = [("10", "1"), ("10", "2")]
    esc.responder("/items/MLC1", Respuesta(200, {"id": "MLC1", "pictures": [{"id": "P1", "secure_url": "https://img.test/p1.jpg"}]}))
    esc.responder("https://img.test/p1.jpg", Respuesta(200))

    esc.correr(imagenes=True)

    texto = esc.publicacion("familia-linterna-pro")
    assert texto.startswith("# Familia: Linterna Pro\n")
    assert "\n## Miembro uno\n" in texto and "\n## Miembro dos\n" in texto
    assert (esc.salida / "publicaciones/familia-linterna-pro/MLC1-miembro-uno/imagenes/01-P1.jpg").is_file()


def test_indice(esc):
    esc.listings = [fila_listing(1, "MLC1", title="Suelta"), fila_listing(2, "MLC2", title="Miembro")]
    esc.familias = [{"id": "10", "name": "Fam"}]
    esc.miembros = [("10", "2")]

    esc.correr()

    lineas = (esc.salida / "indice.md").read_text(encoding="utf-8").splitlines()
    assert lineas[0] == "# Índice de publicaciones"
    assert lineas[2].startswith("| Título | Tipo | Link ML | Precio | Stock | Estado |")
    assert any(l.startswith("| Fam | familia |") and l.endswith("publicaciones/familia-fam/ |") for l in lineas)
    assert any(l.startswith("| ↳ Miembro |") for l in lineas)
    assert any(l.startswith("| Suelta | simple |") for l in lineas)


def test_empresa(esc):
    esc.listings = [fila_listing(1, "MLC1")]
    esc.responder("/users/111", Respuesta(200, CUENTA_API))

    esc.correr()

    texto = (esc.salida / "empresa.md").read_text(encoding="utf-8")
    assert texto.startswith("# AGAS API\n")
    assert "- **Seller ID:** 111\n" in texto
    assert "- **Tienda:** https://ml.test/tienda\n" in texto
    assert "- **Página oficial:** https://tienda.test/oficial\n" in texto
    assert "- **Nivel:** 5_green\n" in texto
    assert "- **Transacciones totales:** 120\n" in texto
    assert "- **Transacciones completadas:** 110\n" in texto
    for etiqueta in ("Activas", "Pausadas", "En revisión", "Otro estado"):
        assert f"- **{etiqueta}:** " in texto
    assert re.search(r"\n_Generado el \d{4}-\d\d-\d\d \d\d:\d\d:\d\d_\n$", texto)
