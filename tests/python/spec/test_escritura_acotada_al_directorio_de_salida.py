import hashlib

import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Escritura acotada al directorio de salida")]


def instantanea(base, excluir):
    return {
        ruta.relative_to(base).as_posix(): hashlib.sha256(ruta.read_bytes()).hexdigest()
        for ruta in sorted(base.rglob("*"))
        if ruta.is_file() and excluir not in ruta.parents
    }


def test_salida_a_un_directorio_temporal(esc, tmp_path, monkeypatch):
    trabajo = tmp_path / "trabajo"
    trabajo.mkdir()
    monkeypatch.chdir(trabajo)
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.familias = [{"id": "10", "name": "Fam"}]
    esc.miembros = [("10", "2")]
    esc.responder(
        "/items/MLA1", Respuesta(200, {"id": "MLA1", "pictures": [{"id": "P1", "secure_url": "https://img.test/p.jpg"}]})
    )
    esc.responder("https://img.test/p.jpg", Respuesta(200))
    antes = instantanea(tmp_path, esc.salida)

    esc.correr(imagenes=True)

    assert (esc.salida / "empresa.md").is_file() and (esc.salida / "indice.md").is_file()
    assert instantanea(tmp_path, esc.salida) == antes
    assert not (tmp_path / "contexto").exists()
    assert list(trabajo.iterdir()) == []
