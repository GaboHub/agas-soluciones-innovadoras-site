import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Publicación no disponible")]


def carpeta_previa(esc, nombre):
    carpeta = esc.salida / "publicaciones" / nombre
    carpeta.mkdir(parents=True)
    (carpeta / "publicacion.md").write_text("previa", encoding="utf-8")
    return carpeta


@pytest.mark.parametrize("estado", [403, 404])
def test_publicacion_eliminada_que_la_base_sigue_listando(esc, capsys, estado):
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.responder("/items/MLA1", Respuesta(estado, {}))
    previa_x = carpeta_previa(esc, "MLA1-titulo-mla1")
    previa_y = carpeta_previa(esc, "MLA2-titulo-mla2")

    esc.correr()

    resumen = capsys.readouterr().out
    assert "Publicaciones no disponibles: 1" in resumen
    assert "    - MLA1" in resumen
    assert "Errores: 0" in resumen
    assert "Carpetas obsoletas eliminadas: 1" in resumen
    assert not previa_x.exists()
    assert previa_y.exists()


def test_la_carpeta_de_una_publicacion_no_disponible_no_se_crea(esc):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(403, {}))

    esc.correr("--only", "MLA1")

    assert esc.carpetas() == []


def test_no_disponible_no_cuenta_como_publicacion_procesada(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.responder("/items/MLA1", Respuesta(403, {}))

    esc.correr()

    assert "Publicaciones procesadas: 1" in capsys.readouterr().out
    assert "MLA1" not in (esc.salida / "indice.md").read_text(encoding="utf-8")


def test_no_disponible_con_only_se_informa_sin_error(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(404, {}))

    esc.correr("--only", "MLA1")

    resumen = capsys.readouterr().out
    assert "    - MLA1" in resumen
    assert "Errores: 0" in resumen


def test_error_del_servidor(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(500, {}))
    obsoleta = carpeta_previa(esc, "MLA9-obsoleta")

    esc.correr()

    resumen = capsys.readouterr().out
    assert "Errores: 0" not in resumen
    assert "MLA1: GET /items/MLA1 returned HTTP 500" in resumen
    assert "se omite la poda" in resumen
    assert "Publicaciones no disponibles: 0" in resumen
    assert obsoleta.exists()


@pytest.mark.parametrize("estado", [400, 401, 410, 429, 502])
def test_otras_respuestas_distintas_de_200_son_error(esc, capsys, estado):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1", Respuesta(estado, {}))

    esc.correr()

    resumen = capsys.readouterr().out
    assert f"MLA1: GET /items/MLA1 returned HTTP {estado}" in resumen
    assert "Publicaciones no disponibles: 0" in resumen


def escenario_familia(esc):
    esc.listings = [
        fila_listing(1, "MLA1", title="Vigente"),
        fila_listing(2, "MLA2", title="Eliminado"),
    ]
    esc.familias = [{"id": "10", "name": "Fam"}]
    esc.miembros = [("10", "1"), ("10", "2")]
    vigente = carpeta_previa(esc, "familia-fam/MLA1-vigente")
    eliminado = carpeta_previa(esc, "familia-fam/MLA2-eliminado")
    ajeno = carpeta_previa(esc, "familia-fam/MLA7-retirado")
    return vigente, eliminado, ajeno


def test_miembro_de_familia_no_disponible(esc, capsys):
    vigente, eliminado, ajeno = escenario_familia(esc)
    esc.responder("/items/MLA2", Respuesta(403, {}))

    esc.correr()

    resumen = capsys.readouterr().out
    assert "Errores: 0" in resumen
    assert "Publicaciones no disponibles: 1" in resumen
    assert "Carpetas obsoletas eliminadas: 2" in resumen
    assert not eliminado.exists()
    assert not ajeno.exists()
    assert vigente.exists()


def test_miembro_de_familia_no_disponible_con_only_no_poda(esc):
    vigente, eliminado, ajeno = escenario_familia(esc)
    esc.responder("/items/MLA2", Respuesta(403, {}))

    esc.correr("--only", "MLA2")

    assert vigente.exists() and eliminado.exists() and ajeno.exists()


def test_miembro_de_familia_no_disponible_con_errores_no_poda(esc):
    vigente, eliminado, ajeno = escenario_familia(esc)
    esc.responder("/items/MLA2", Respuesta(403, {}))
    esc.responder("/items/MLA1", Respuesta(500, {}))

    esc.correr()

    assert vigente.exists() and eliminado.exists() and ajeno.exists()
