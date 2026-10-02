import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Poda conservadora")]


def carpeta(esc, nombre):
    ruta = esc.salida / "publicaciones" / nombre
    ruta.mkdir(parents=True)
    (ruta / "publicacion.md").write_text("previa", encoding="utf-8")
    return ruta


def test_corrida_con_errores(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.responder("/items/MLA2", Respuesta(500, {}))
    obsoleta = carpeta(esc, "MLA9-obsoleta")

    esc.correr()

    assert obsoleta.exists()
    assert "se omite la poda de carpetas obsoletas" in capsys.readouterr().out


def test_listado_vacio(esc, capsys):
    esc.listings = []
    obsoleta = carpeta(esc, "MLA9-obsoleta")

    esc.correr()

    assert obsoleta.exists()
    assert "Listado de publicaciones vacío: se omite la poda" in capsys.readouterr().out


def test_corrida_limpia(esc, capsys):
    esc.listings = [
        fila_listing(1, "MLA1", title="Suelta"),
        fila_listing(2, "MLA2", title="Miembro"),
    ]
    esc.familias = [{"id": "10", "name": "Fam"}]
    esc.miembros = [("10", "2")]
    obsoleta = carpeta(esc, "MLA9-obsoleta")
    suelta = carpeta(esc, "MLA1-suelta")
    familia = carpeta(esc, "familia-fam")

    esc.correr()

    assert not obsoleta.exists()
    assert suelta.exists() and familia.exists()
    resumen = capsys.readouterr().out
    assert "Carpeta obsoleta eliminada: MLA9-obsoleta" in resumen
    assert "Carpetas obsoletas eliminadas: 1" in resumen


def test_con_only_no_poda(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    obsoleta = carpeta(esc, "MLA9-obsoleta")

    esc.correr("--only", "MLA1")

    assert obsoleta.exists()
    assert "Carpetas obsoletas eliminadas: 0" in capsys.readouterr().out
