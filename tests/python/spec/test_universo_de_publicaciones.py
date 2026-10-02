import pytest

from arnes_barrido import fila_listing

pytestmark = [pytest.mark.spec("barrido", "Universo de publicaciones")]


def test_miembro_de_familia(esc):
    esc.listings = [
        fila_listing(1, "MLA1", title="Miembro", family_name="Linterna"),
        fila_listing(2, "MLA2", title="Suelta"),
    ]
    esc.familias = [{"id": "10", "name": "Linterna"}]
    esc.miembros = [("10", "1")]

    esc.correr()

    assert esc.carpetas() == ["MLA2-suelta", "familia-linterna"]
    texto = esc.publicacion("familia-linterna")
    assert "## Miembro\n" in texto
    assert "- **ML Item ID:** MLA1\n" in texto


def test_ids_repetibles_y_separados_por_coma(esc):
    esc.listings = [fila_listing(i, f"MLA{i}") for i in range(1, 5)]
    esc.familias = [{"id": "10", "name": "Familia"}]
    esc.miembros = [("10", "1")]

    esc.correr("--only", "MLA1,MLA2", "--only", "MLA3")

    assert esc.carpetas() == ["MLA1-titulo-mla1", "MLA2-titulo-mla2", "MLA3-titulo-mla3"]
    assert sorted({r for r in esc.rutas_pedidas() if r.startswith("/items/MLA") and r.count("/") == 2}) == [
        "/items/MLA1",
        "/items/MLA2",
        "/items/MLA3",
    ]
    assert not any("virtual_family" in sql for sql in esc.consultas)


def test_todas_las_publicaciones_de_la_cuenta_sin_only(esc):
    esc.listings = [fila_listing(i, f"MLA{i}") for i in (1, 2, 3)]

    esc.correr()

    assert esc.carpetas() == ["MLA1-titulo-mla1", "MLA2-titulo-mla2", "MLA3-titulo-mla3"]


def test_las_publicaciones_se_procesan_en_orden_de_id(esc):
    esc.listings = [
        fila_listing(30, "MLA30"),
        fila_listing(4, "MLA4"),
        fila_listing(100, "MLA100"),
    ]

    esc.correr()

    filas = (esc.salida / "indice.md").read_text(encoding="utf-8").splitlines()[4:]
    assert [fila.split("|")[1].strip() for fila in filas] == [
        "Titulo MLA4",
        "Titulo MLA30",
        "Titulo MLA100",
    ]


def test_las_familias_se_procesan_en_orden_de_id(esc):
    esc.listings = [fila_listing(1, "MLA1"), fila_listing(2, "MLA2")]
    esc.familias = [{"id": "20", "name": "Segunda"}, {"id": "3", "name": "Primera"}]
    esc.miembros = [("20", "1"), ("3", "2")]

    esc.correr()

    filas = (esc.salida / "indice.md").read_text(encoding="utf-8").splitlines()[4:]
    assert [fila.split("|")[1].strip() for fila in filas if fila.split("|")[2].strip() == "familia"] == [
        "Primera",
        "Segunda",
    ]
