import pytest
import requests

from arnes_barrido import Respuesta

pytestmark = [pytest.mark.spec("barrido", "Reintentos con backoff")]

URL = "https://api.mercadolibre.com/items/MLA1"


def pedir(esc, *secuencia):
    esc.responder("/items/MLA1", *secuencia)
    return esc.modulo.get_with_retry(requests.Session(), URL)


def test_retry_after_respetado(esc):
    respuesta = pedir(esc, Respuesta(429, {}, {"Retry-After": "2"}), Respuesta(200, {}))

    assert respuesta.status_code == 200
    assert len(esc.esperas) == 1
    assert esc.esperas[0] >= 2


def test_excepciones_seguidas(esc):
    with pytest.raises(RuntimeError):
        pedir(esc, requests.ConnectionError("sin red"))

    assert len(esc.llamadas) == 3


def test_espera_exponencial_con_jitter(esc, monkeypatch):
    monkeypatch.setattr(esc.modulo.random, "uniform", lambda bajo, alto: alto)

    pedir(esc, Respuesta(503, {}), Respuesta(503, {}), Respuesta(200, {}))

    assert esc.esperas == pytest.approx([0.3 * 1 + 0.3, 0.3 * 2 + 0.3])


def test_intentos_agotados_devuelven_la_ultima_respuesta(esc):
    respuesta = pedir(esc, Respuesta(500, {}), Respuesta(502, {}), Respuesta(504, {}))

    assert respuesta.status_code == 504
    assert len(esc.llamadas) == 3
    assert len(esc.esperas) == 2


@pytest.mark.parametrize("estado", [429, 500, 502, 503, 504])
def test_estados_reintentables(esc, estado):
    respuesta = pedir(esc, Respuesta(estado, {}), Respuesta(200, {}))

    assert respuesta.status_code == 200
    assert len(esc.llamadas) == 2


def test_estado_no_reintentable_no_reintenta(esc):
    respuesta = pedir(esc, Respuesta(404, {}), Respuesta(200, {}))

    assert respuesta.status_code == 404
    assert len(esc.llamadas) == 1
    assert esc.esperas == []


def test_una_excepcion_seguida_de_exito_se_recupera(esc):
    respuesta = pedir(esc, requests.ConnectionError("sin red"), Respuesta(200, {}))

    assert respuesta.status_code == 200
    assert len(esc.llamadas) == 2
