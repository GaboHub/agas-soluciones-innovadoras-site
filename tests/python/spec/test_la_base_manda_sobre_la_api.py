import pytest

from arnes_barrido import Respuesta, fila_listing

pytestmark = [pytest.mark.spec("barrido", "La base manda sobre la API")]


def test_estado_discordante(esc):
    esc.listings = [fila_listing(1, "MLA1", status="active")]
    esc.responder("/items/MLA1", Respuesta(200, {"id": "MLA1", "status": "closed"}))

    esc.correr()

    assert "- **Estado:** active\n" in esc.publicacion("MLA1-titulo-mla1")


def test_precio_ausente_en_la_base(esc):
    esc.listings = [fila_listing(1, "MLA1", price="")]
    esc.responder("/items/MLA1", Respuesta(200, {"id": "MLA1", "price": 12345}))

    esc.correr()

    assert "- **Precio:** $12.345\n" in esc.publicacion("MLA1-titulo-mla1")


def test_los_campos_de_la_base_prevalecen_sobre_los_de_la_api(esc):
    esc.listings = [
        fila_listing(
            1, "MLA1", title="Titulo base", price="1000", permalink="https://ml.test/base",
            available_quantity="7", sold_quantity="3", seller_sku="SKU-BASE", catalog_listing="t",
            family_name="Familia base", user_product_id="UP-BASE",
        )
    ]
    esc.responder(
        "/items/MLA1",
        Respuesta(
            200,
            {
                "id": "MLA1", "title": "Titulo api", "price": 9, "permalink": "https://ml.test/api",
                "available_quantity": 99, "sold_quantity": 98, "seller_custom_field": "SKU-API",
                "catalog_listing": False, "family_name": "Familia api", "user_product_id": "UP-API",
            },
        ),
    )

    esc.correr()

    texto = esc.publicacion("MLA1-titulo-base")
    assert "# Titulo base" in texto
    assert "- **Link:** https://ml.test/base\n" in texto
    assert "- **Catálogo:** Sí\n" in texto
    assert "- **Familia ML:** Familia base (user_product_id UP-BASE)\n" in texto
    assert "- **Precio:** $1.000\n" in texto
    assert "- **Stock disponible:** 7\n" in texto
    assert "- **Vendidos:** 3\n" in texto
    assert "- **SKU:** SKU-BASE\n" in texto


def test_original_price_y_condicion_vienen_solo_de_la_api(esc):
    esc.listings = [fila_listing(1, "MLA1", price="1000")]
    esc.responder(
        "/items/MLA1", Respuesta(200, {"id": "MLA1", "original_price": 2500, "condition": "new"})
    )

    esc.correr()

    texto = esc.publicacion("MLA1-titulo-mla1")
    assert "- **Precio:** $1.000 (precio original $2.500)\n" in texto
    assert "- **Condición:** new\n" in texto
