import json

import pytest

from arnes_barrido import Escenario, fila_listing

pytestmark = [pytest.mark.spec("barrido", "Página oficial desde los datos del sitio")]


@pytest.mark.parametrize("url", ["https://tienda.test/una", "https://tienda.test/otra"])
def test_url_cambiada_en_los_datos(cargar_barrido, tmp_path, monkeypatch, url):
    modulo = cargar_barrido(site_json=json.dumps({"mercadolibre": {"paginaOficial": url}}))
    esc = Escenario(modulo, tmp_path, monkeypatch)
    esc.listings = [fila_listing(1, "MLA1")]

    esc.correr()

    assert f"- **Página oficial:** {url}\n" in (esc.salida / "empresa.md").read_text(encoding="utf-8")
