import re
from collections import defaultdict
from pathlib import Path

REQUIREMENT = re.compile(r"^### Requirement:\s*(.+?)\s*$", re.M)
SECCION = re.compile(r"^## (\w+)", re.M)
RENOMBRADO = re.compile(r"^-\s*(FROM|TO):\s*`?### Requirement:\s*(.+?)`?\s*$", re.M)
CITA = re.compile(
    r"""^\s*(?:pytestmark\s*=\s*\[\s*|@)pytest\.mark\.spec\(\s*(["'])(.+?)\1\s*,\s*(["'])(.+?)\3\s*\)""",
    re.M,
)
CAPA = "tests/python/spec/"


def secciones(texto):
    cortes = list(SECCION.finditer(texto))
    for indice, corte in enumerate(cortes):
        fin = cortes[indice + 1].start() if indice + 1 < len(cortes) else len(texto)
        yield corte.group(1), texto[corte.end():fin]


def requirements_vigentes(raiz_openspec: Path):
    base = defaultdict(set)
    agregados = defaultdict(set)
    quitados = defaultdict(set)
    for spec in (raiz_openspec / "specs").glob("*/spec.md"):
        base[spec.parent.name].update(REQUIREMENT.findall(spec.read_text(encoding="utf-8")))
    for delta in (raiz_openspec / "changes").glob("*/specs/*/spec.md"):
        capability = delta.parent.name
        for tipo, cuerpo in secciones(delta.read_text(encoding="utf-8")):
            if tipo in ("ADDED", "MODIFIED"):
                agregados[capability].update(REQUIREMENT.findall(cuerpo))
            elif tipo == "REMOVED":
                quitados[capability].update(REQUIREMENT.findall(cuerpo))
            elif tipo == "RENAMED":
                for lado, nombre in RENOMBRADO.findall(cuerpo):
                    (quitados if lado == "FROM" else agregados)[capability].add(nombre)
    vigentes = {}
    for capability in set(base) | set(agregados) | set(quitados):
        vigentes[capability] = (base[capability] | agregados[capability]) - quitados[capability]
    return vigentes


def citas(archivos: dict[str, str]):
    return [
        (capability, requirement, archivo)
        for archivo, texto in archivos.items()
        for _, capability, _, requirement in CITA.findall(texto)
    ]


def hallazgos(vigentes, citas_halladas, propias):
    no_resuelven = [c for c in citas_halladas if c[1] not in vigentes.get(c[0], set())]
    citados = {(capability, requirement) for capability, requirement, _ in citas_halladas}
    sin_cita = [
        (capability, requirement)
        for capability in sorted(propias)
        for requirement in sorted(vigentes.get(capability, set()))
        if (capability, requirement) not in citados
    ]
    fuera_de_capa = [c for c in citas_halladas if not c[2].startswith(CAPA)]
    return no_resuelven, sin_cita, fuera_de_capa


def leer_fuentes(raiz_repo: Path):
    base = raiz_repo / "tests" / "python"
    return {
        archivo.relative_to(raiz_repo).as_posix(): archivo.read_text(encoding="utf-8")
        for archivo in sorted(base.rglob("*.py"))
    }
