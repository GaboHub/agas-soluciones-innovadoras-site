import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Datos de la API de Mercado Libre")]


def reseñas(total, desde, cantidad):
    return Respuesta(
        200,
        {
            "paging": {"total": total, "total_pageable": total, "reviews_with_comment": 0},
            "rating_average": 4.5,
            "reviews": [{"rate": 5, "title": f"r{i}"} for i in range(desde, desde + cantidad)],
        },
    )


def test_endpoints_consultados_por_publicacion(esc):
    esc.listings = [fila_listing(1, "MLA1")]

    esc.correr()

    assert sorted(esc.llamadas, key=lambda llamada: llamada[0]) == sorted(
        [
            ("/items/MLA1", None),
            ("/items/MLA1/description", None),
            ("/seller-promotions/items/MLA1", {"app_version": "v2"}),
            ("/reviews/item/MLA1", {"limit": 50, "offset": 0}),
            ("/users/111", None),
        ],
        key=lambda llamada: llamada[0],
    )


def test_resenas_paginadas(esc):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder(
        "/reviews/item/MLA1", reseñas(120, 0, 50), reseñas(120, 50, 50), reseñas(120, 100, 20)
    )

    esc.correr()

    paginas = [params for ruta, params in esc.llamadas if ruta == "/reviews/item/MLA1"]
    assert paginas == [
        {"limit": 50, "offset": 0},
        {"limit": 50, "offset": 50},
        {"limit": 50, "offset": 100},
    ]
    assert "r119" in esc.publicacion("MLA1-titulo-mla1")


def test_descripcion_inexistente(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/items/MLA1/description", Respuesta(404, {}))

    esc.correr()

    texto = esc.publicacion("MLA1-titulo-mla1")
    assert "### Descripción\n\nSin descripción.\n" in texto
    assert "Errores: 0" in capsys.readouterr().out


def test_promociones_y_resenas_con_4xx_no_cuentan_como_error(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/seller-promotions/items/MLA1", Respuesta(403, {}))
    esc.responder("/reviews/item/MLA1", Respuesta(404, {}))

    esc.correr()

    assert "Errores: 0" in capsys.readouterr().out


def test_promociones_con_5xx_si_cuentan_como_error(esc, capsys):
    esc.listings = [fila_listing(1, "MLA1")]
    esc.responder("/seller-promotions/items/MLA1", Respuesta(500, {}))

    esc.correr()

    assert "Errores: 1" in capsys.readouterr().out
