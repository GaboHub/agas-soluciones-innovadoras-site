import csv
import importlib.util
import io
import itertools
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import requests

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "exportar-contexto-ml.py"
ENTORNO_BASE = {
    "AGAS_ML_USER_ID": "111",
    "AGAS_PG_CONTAINER": "pg-test",
    "AGAS_PG_USER": "usuario-test",
    "AGAS_PG_DB": "base-test",
}
SITE_JSON = '{"mercadolibre": {"paginaOficial": "https://tienda.test/oficial"}}'
CONTADOR = itertools.count()


class Respuesta:
    def __init__(self, status_code=200, cuerpo=None, headers=None):
        self.status_code = status_code
        self.cuerpo = cuerpo
        self.headers = headers or {}
        self.content = b"x"

    def __bool__(self):
        return self.status_code < 400

    def json(self):
        return self.cuerpo


def preparar_raiz(base: Path, dotenv: str | None = None, site_json: str = SITE_JSON) -> Path:
    raiz = base / "raiz"
    (raiz / "scripts").mkdir(parents=True, exist_ok=True)
    (raiz / "src" / "data").mkdir(parents=True, exist_ok=True)
    shutil.copy(SCRIPT, raiz / "scripts" / SCRIPT.name)
    (raiz / "src" / "data" / "site.json").write_text(site_json, encoding="utf-8")
    if dotenv is not None:
        (raiz / ".env").write_text(dotenv, encoding="utf-8")
    return raiz


def cargar_modulo(raiz: Path):
    nombre = f"barrido_bajo_prueba_{next(CONTADOR)}"
    spec = importlib.util.spec_from_file_location(nombre, raiz / "scripts" / SCRIPT.name)
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[nombre] = modulo
    spec.loader.exec_module(modulo)
    return modulo


def fila_listing(id, ml_item_id, **campos):
    fila = {
        "id": str(id),
        "ml_item_id": ml_item_id,
        "title": f"Titulo {ml_item_id}",
        "status": "active",
        "price": "1000",
        "has_variations": "f",
        "permalink": f"https://ml.test/{ml_item_id}",
        "thumbnail_url": "",
        "available_quantity": "5",
        "sold_quantity": "2",
        "seller_sku": f"SKU-{ml_item_id}",
        "user_product_id": "",
        "family_name": "",
        "catalog_listing": "f",
    }
    fila.update(campos)
    return fila


def a_csv(filas):
    if not filas:
        return "id\n"
    salida = io.StringIO()
    escritor = csv.DictWriter(salida, fieldnames=list(filas[0]), lineterminator="\n")
    escritor.writeheader()
    escritor.writerows(filas)
    return salida.getvalue()


class Escenario:
    def __init__(self, modulo, base: Path, monkeypatch):
        self.modulo = modulo
        self.salida = base / "salida"
        self.cuenta = {
            "id": "1",
            "ml_user_id": "111",
            "nickname": "AGAS",
            "access_token": "tok",
            "token_expires_at": "2999-01-01 00:00:00+00",
        }
        self.listings = []
        self.familias = []
        self.miembros = []
        self.variaciones = []
        self.psql_returncode = 0
        self.psql_stderr = ""
        self.consultas = []
        self.comandos = []
        self.respuestas = {}
        self.llamadas = []
        self.esperas = []
        monkeypatch.setattr(subprocess, "run", self._psql)
        monkeypatch.setattr(
            requests.Session, "get", lambda sesion, url, params=None, timeout=None: self._get(url, params)
        )
        monkeypatch.setattr(time, "sleep", self.esperas.append)
        self.monkeypatch = monkeypatch

    def _psql(self, comando, **kwargs):
        self.comandos.append((comando, kwargs))
        sql = comando[-1]
        self.consultas.append(sql)
        if self.psql_returncode != 0:
            return subprocess.CompletedProcess(comando, self.psql_returncode, "", self.psql_stderr)
        return subprocess.CompletedProcess(comando, 0, a_csv(self._filas(sql)), "")

    def _filas(self, sql):
        if "FROM ml_account" in sql:
            return [self.cuenta] if self.cuenta else []
        if "FROM listing_variation" in sql:
            return self.variaciones
        if "virtual_family_member" in sql:
            return [{"family_id": f, "listing_id": l} for f, l in self.miembros]
        if "FROM virtual_family" in sql:
            return self._ordenadas(sql, self.familias)
        coincidencia = re.search(r"ml_item_id = '([^']*)'", sql)
        if coincidencia:
            return [fila for fila in self.listings if fila["ml_item_id"] == coincidencia.group(1)]
        return self._ordenadas(sql, self.listings)

    def _ordenadas(self, sql, filas):
        if "ORDER BY id" in sql:
            return sorted(filas, key=lambda fila: int(fila["id"]))
        return list(filas)

    def responder(self, ruta, *secuencia):
        self.respuestas[ruta] = list(secuencia)

    def _get(self, url, params):
        ruta = url.removeprefix(self.modulo.ML_API_BASE)
        self.llamadas.append((ruta, params))
        secuencia = self.respuestas.get(ruta)
        if secuencia is None:
            return self._por_defecto(ruta)
        elemento = secuencia.pop(0) if len(secuencia) > 1 else secuencia[0]
        if isinstance(elemento, Exception):
            raise elemento
        return elemento

    def _por_defecto(self, ruta):
        if re.fullmatch(r"/items/[^/]+/description", ruta):
            return Respuesta(200, {"plain_text": "descripcion api"})
        if ruta.startswith("/seller-promotions/"):
            return Respuesta(200, [])
        if ruta.startswith("/reviews/item/"):
            return Respuesta(200, {"paging": {"total": 0}, "reviews": []})
        if ruta.startswith("/users/"):
            return Respuesta(200, {})
        if ruta.startswith("/items/"):
            ml_item_id = ruta.rsplit("/", 1)[1]
            return Respuesta(200, {"id": ml_item_id, "title": "Titulo api", "status": "api"})
        return Respuesta(404, {})

    def correr(self, *argumentos, imagenes=False):
        saltar = [] if imagenes else ["--skip-images"]
        self.monkeypatch.setattr(sys, "argv", ["barrido", *saltar, "--output", str(self.salida), *argumentos])
        self.modulo.main()

    def rutas_pedidas(self):
        return [ruta for ruta, _ in self.llamadas]

    def publicacion(self, *partes):
        return (self.salida / "publicaciones").joinpath(*partes, "publicacion.md").read_text(encoding="utf-8")

    def carpetas(self, *partes):
        return sorted(p.name for p in (self.salida / "publicaciones").joinpath(*partes).iterdir() if p.is_dir())
