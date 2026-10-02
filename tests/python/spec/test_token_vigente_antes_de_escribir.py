import pytest

pytestmark = [pytest.mark.spec("barrido", "Token vigente antes de escribir")]


def test_token_vencido(esc):
    esc.cuenta["token_expires_at"] = "2000-01-01 00:00:00+00"

    with pytest.raises(SystemExit) as salida:
        esc.correr()

    mensaje = str(salida.value)
    assert "Access token" in mensaje and "expired" in mensaje
    assert not esc.salida.exists()


def test_token_vigente_permite_escribir(esc):
    esc.correr()

    assert (esc.salida / "publicaciones").is_dir()
