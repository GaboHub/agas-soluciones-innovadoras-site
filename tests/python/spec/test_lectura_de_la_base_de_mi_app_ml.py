import subprocess

import pytest

pytestmark = [pytest.mark.spec("barrido", "Lectura de la base de mi-app-ml")]


def test_las_consultas_van_por_docker_exec_psql_en_csv(esc):
    esc.listings = []

    esc.correr()

    comando, kwargs = esc.comandos[0]
    assert comando[:6] == ["docker", "exec", "pg-test", "psql", "-U", "usuario-test"]
    assert comando[6:9] == ["-d", "base-test", "--csv"]
    assert kwargs["timeout"] == 30


def test_contenedor_caido(esc):
    esc.psql_returncode = 1
    esc.psql_stderr = "no such container"

    with pytest.raises(SystemExit) as salida:
        esc.correr()

    mensaje = str(salida.value)
    assert "Database container pg-test is not running or the query failed" in mensaje
    assert "no such container" in mensaje
    assert not esc.salida.exists()


def test_cuenta_inexistente(esc):
    esc.cuenta = None

    with pytest.raises(SystemExit) as salida:
        esc.correr()

    assert "No ml_account row found" in str(salida.value)


def test_timeout_de_psql(esc, monkeypatch):
    def agotar(comando, **kwargs):
        raise subprocess.TimeoutExpired(comando, 30)

    monkeypatch.setattr(subprocess, "run", agotar)

    with pytest.raises(SystemExit) as salida:
        esc.correr()

    assert "Database container pg-test is not running" in str(salida.value)
