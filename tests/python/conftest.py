import os
import sys

import pytest

from arnes_barrido import ENTORNO_BASE, Escenario, cargar_modulo, preparar_raiz


@pytest.fixture
def cargar_barrido(tmp_path, monkeypatch):
    original = dict(os.environ)
    cargados = []

    def cargar(entorno=None, dotenv=None, site_json=None):
        for clave in [c for c in os.environ if c.startswith("AGAS_")]:
            del os.environ[clave]
        os.environ.update({**ENTORNO_BASE, "AGAS_CONTEXT_DIR": str(tmp_path / "contexto")})
        for clave, valor in (entorno or {}).items():
            if valor is None:
                os.environ.pop(clave, None)
            else:
                os.environ[clave] = valor
        raiz = preparar_raiz(tmp_path, dotenv, *([site_json] if site_json else []))
        modulo = cargar_modulo(raiz)
        cargados.append(modulo.__name__)
        return modulo

    yield cargar
    os.environ.clear()
    os.environ.update(original)
    for nombre in cargados:
        sys.modules.pop(nombre, None)


@pytest.fixture
def esc(cargar_barrido, tmp_path, monkeypatch):
    return Escenario(cargar_barrido(), tmp_path, monkeypatch)


@pytest.fixture(autouse=True)
def cwd_aislado(tmp_path, monkeypatch):
    trabajo = tmp_path / "cwd"
    trabajo.mkdir()
    monkeypatch.chdir(trabajo)
