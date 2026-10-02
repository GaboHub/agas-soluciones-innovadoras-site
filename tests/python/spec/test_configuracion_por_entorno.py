import subprocess
import sys

import pytest

from arnes_barrido import SCRIPT, preparar_raiz

pytestmark = [pytest.mark.spec("barrido", "Configuración por entorno")]


def test_el_entorno_manda_sobre_el_archivo(cargar_barrido, monkeypatch):
    modulo = cargar_barrido(entorno={"AGAS_PG_DB": "y"}, dotenv="AGAS_PG_DB=x\n")
    comandos = []

    def psql_falso(comando, **kwargs):
        comandos.append(comando)
        return subprocess.CompletedProcess(comando, 0, "id\n", "")

    monkeypatch.setattr(subprocess, "run", psql_falso)

    modulo.run_psql("SELECT 1")

    comando = comandos[0]
    assert comando[comando.index("-d") + 1] == "y"


def test_el_archivo_rellena_lo_que_el_entorno_no_define(cargar_barrido):
    modulo = cargar_barrido(entorno={"AGAS_PG_USER": None}, dotenv="AGAS_PG_USER=desde-archivo\n")

    assert modulo.PG_USER == "desde-archivo"


def test_id_de_vendedor_invalido(tmp_path):
    raiz = preparar_raiz(tmp_path)
    docker_invocado = tmp_path / "docker-invocado"
    bin_falso = tmp_path / "bin"
    bin_falso.mkdir()
    docker = bin_falso / "docker"
    docker.write_text(f"#!/bin/sh\ntouch {docker_invocado}\nexit 1\n")
    docker.chmod(0o755)
    salida = tmp_path / "salida"

    resultado = subprocess.run(
        [sys.executable, str(raiz / "scripts" / SCRIPT.name), "--output", str(salida)],
        env={"PATH": str(bin_falso), "AGAS_ML_USER_ID": "abc"},
        capture_output=True,
        text=True,
    )

    assert resultado.returncode != 0
    assert "AGAS_ML_USER_ID" in resultado.stderr
    assert not docker_invocado.exists()
    assert not salida.exists()
