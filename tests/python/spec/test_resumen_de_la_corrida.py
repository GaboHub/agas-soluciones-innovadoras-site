import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Resumen de la corrida")]


def test_el_resumen_trae_todos_los_totales_en_orden(esc, capsys):
    esc.listings = [
        fila_listing(1, "MLA1"),
        fila_listing(2, "MLA2"),
        fila_listing(3, "MLA3"),
        fila_listing(4, "MLA4"),
    ]
    esc.familias = [{"id": "10", "name": "Fam"}]
    esc.miembros = [("10", "2")]
    esc.responder("/items/MLA3", Respuesta(403, {}))
    esc.responder("/items/MLA1", Respuesta(200, {"id": "MLA1", "video_id": "V1"}))
    (esc.salida / "publicaciones" / "MLA9-obsoleta").mkdir(parents=True)

    esc.correr()

    lineas = capsys.readouterr().out.splitlines()
    assert lineas == [
        "Carpeta obsoleta eliminada: MLA9-obsoleta",
        "Resumen del barrido",
        "  Publicaciones procesadas: 3",
        "  Familias: 1",
        "  Imágenes descargadas: 0",
        "  Imágenes saltadas (ya existían): 0",
        "  Videos encontrados: 1",
        "  Videos exportados como referencia: 1",
        "  Publicaciones no disponibles: 1",
        "    - MLA3",
        "  Carpetas obsoletas eliminadas: 1",
        "  Errores: 0",
    ]


def test_errores_listados(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.responder("/items/MLA1", Respuesta(500, {}))
    esc.responder("/items/MLA2/description", Respuesta(500, {}))

    esc.correr()

    resumen = capsys.readouterr().out
    assert "    - MLA1: GET /items/MLA1 returned HTTP 500" in resumen
    assert "    - MLA2: GET description for MLA2 returned HTTP 500" in resumen
    assert "Errores: 3" in resumen
