from pathlib import Path

import pytest

from auditoria_spec import CAPA, citas, hallazgos, leer_fuentes, requirements_vigentes

RAIZ_REPO = Path(__file__).resolve().parents[2]
CAPACIDADES_PROPIAS = ["barrido"]


def spec(cuerpo):
    return "## Requirements\n\n" + cuerpo


def delta(*secciones):
    return "".join(f"## {tipo} Requirements\n\n{cuerpo}\n" for tipo, cuerpo in secciones)


def requirement(nombre):
    return f"### Requirement: {nombre}\nTexto.\n\n"


def escribir(ruta: Path, texto: str):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding="utf-8")


def cita(capability, nombre, comillas='"'):
    return f"pytestmark = [pytest.mark.spec({comillas}{capability}{comillas}, {comillas}{nombre}{comillas})]\n"


def test_requirements_vigentes_une_spec_viva_y_deltas(tmp_path):
    escribir(tmp_path / "specs/a/spec.md", spec(requirement("Viejo") + requirement("Estable")))
    escribir(tmp_path / "changes/c1/specs/a/spec.md", delta(("ADDED", requirement("Nuevo"))))
    escribir(tmp_path / "changes/c1/specs/b/spec.md", delta(("MODIFIED", requirement("Otro"))))

    assert requirements_vigentes(tmp_path) == {"a": {"Viejo", "Estable", "Nuevo"}, "b": {"Otro"}}


def test_requirement_removed_deja_de_ser_vigente(tmp_path):
    escribir(tmp_path / "specs/a/spec.md", spec(requirement("Viejo") + requirement("Estable")))
    escribir(tmp_path / "changes/c1/specs/a/spec.md", delta(("REMOVED", requirement("Viejo"))))

    assert requirements_vigentes(tmp_path) == {"a": {"Estable"}}


def test_renamed_reemplaza_el_nombre_viejo_por_el_nuevo(tmp_path):
    escribir(tmp_path / "specs/a/spec.md", spec(requirement("Viejo")))
    renombrado = "- FROM: `### Requirement: Viejo`\n- TO: `### Requirement: Nuevo`\n"
    escribir(tmp_path / "changes/c1/specs/a/spec.md", delta(("RENAMED", renombrado)))

    assert requirements_vigentes(tmp_path) == {"a": {"Nuevo"}}


def test_changes_archive_se_ignora(tmp_path):
    escribir(tmp_path / "changes/archive/2026-01-01-x/specs/a/spec.md", delta(("ADDED", requirement("Archivado"))))
    escribir(tmp_path / "changes/c1/specs/a/spec.md", delta(("ADDED", requirement("Vivo"))))

    assert requirements_vigentes(tmp_path) == {"a": {"Vivo"}}


def test_sin_spec_viva_las_capabilities_salen_de_los_deltas(tmp_path):
    escribir(tmp_path / "changes/c1/specs/a/spec.md", delta(("ADDED", requirement("Solo delta"))))

    assert requirements_vigentes(tmp_path) == {"a": {"Solo delta"}}


def test_citas_acepta_comillas_simples_y_dobles_y_decorador():
    archivos = {
        "tests/python/spec/a.py": cita("cap", "Uno") + cita("cap", "Dos", "'"),
        "tests/python/spec/b.py": '@pytest.mark.spec("cap", "Tres")\ndef test_x(): ...\n',
        "tests/python/spec/c.py": "x = 1\n",
    }

    assert citas(archivos) == [
        ("cap", "Uno", "tests/python/spec/a.py"),
        ("cap", "Dos", "tests/python/spec/a.py"),
        ("cap", "Tres", "tests/python/spec/b.py"),
    ]


def test_cita_que_no_resuelve():
    vigentes = {"cap": {"Uno"}}
    halladas = [("cap", "Inventado", f"{CAPA}a.py"), ("otra", "Uno", f"{CAPA}b.py"), ("cap", "Uno", f"{CAPA}c.py")]

    no_resuelven, sin_cita, fuera = hallazgos(vigentes, halladas, [])

    assert no_resuelven == halladas[:2]
    assert sin_cita == [] and fuera == []


def test_requirement_de_capability_propia_sin_cita():
    vigentes = {"cap": {"Uno", "Dos"}, "ajena": {"Tres"}}
    halladas = [("cap", "Uno", f"{CAPA}a.py")]

    no_resuelven, sin_cita, fuera = hallazgos(vigentes, halladas, ["cap"])

    assert sin_cita == [("cap", "Dos")]
    assert no_resuelven == [] and fuera == []


def test_capability_ajena_no_exige_cobertura():
    assert hallazgos({"ajena": {"Tres"}}, [], [])[1] == []


def test_cita_fuera_de_la_capa_spec():
    vigentes = {"cap": {"Uno"}}
    halladas = [("cap", "Uno", "tests/python/test_suelto.py"), ("cap", "Uno", f"{CAPA}ok.py")]

    no_resuelven, sin_cita, fuera = hallazgos(vigentes, halladas, [])

    assert fuera == [halladas[0]]
    assert no_resuelven == [] and sin_cita == []


def test_leer_fuentes_escanea_tests_python_con_rutas_relativas(tmp_path):
    escribir(tmp_path / "tests/python/spec/a.py", "uno")
    escribir(tmp_path / "tests/python/b.py", "dos")
    escribir(tmp_path / "otro/c.py", "tres")

    assert leer_fuentes(tmp_path) == {"tests/python/b.py": "dos", "tests/python/spec/a.py": "uno"}


def test_la_suite_cita_requirements_que_existen_y_solo_desde_la_capa_spec():
    vigentes = requirements_vigentes(RAIZ_REPO / "openspec")
    halladas = citas(leer_fuentes(RAIZ_REPO))

    no_resuelven, sin_cita, fuera = hallazgos(vigentes, halladas, CAPACIDADES_PROPIAS)

    problemas = (
        [f"cita que no resuelve: [{c}] {r} ({a})" for c, r, a in no_resuelven]
        + [f"requirement sin cita: [{c}] {r}" for c, r in sin_cita]
        + [f"cita fuera de {CAPA}: [{c}] {r} ({a})" for c, r, a in fuera]
    )
    assert not problemas, "\n".join(problemas)
    assert halladas
