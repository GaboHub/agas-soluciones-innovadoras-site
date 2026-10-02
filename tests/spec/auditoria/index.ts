import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type Cita = { cap: string; requirement: string; archivo: string };
export type Vigentes = Record<string, string[]>;
export type Fuente = { ruta: string; texto: string };
export type Hallazgos = {
  noResuelven: Cita[];
  sinCita: { cap: string; requirement: string }[];
  fueraDeCapa: Cita[];
  capacidadesInexistentes: string[];
};

type Cambios = { suman: string[]; restan: string[] };

const ENCABEZADO_REQUIREMENT = /^### Requirement:\s*(.+?)\s*$/;
const ENCABEZADO_SECCION = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\b/;
const RENOMBRE = /^-\s*(FROM|TO):\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;
const CITA = /^(?:test\.)?describe\(\s*(['"`])\[([a-z0-9-]+)\]\s+(.+?)\1/gm;
const CAPAS = [/^tests\/spec\/.+\.test\.ts$/, /^e2e\/spec\/.+\.spec\.ts$/];

const cambiosDeTexto = (texto: string): Cambios => {
  const cambios: Cambios = { suman: [], restan: [] };
  let seccion = 'ADDED';
  for (const linea of texto.split('\n')) {
    const encabezado = ENCABEZADO_SECCION.exec(linea);
    if (encabezado) {
      seccion = encabezado[1];
      continue;
    }
    if (seccion === 'RENAMED') {
      const renombre = RENOMBRE.exec(linea);
      if (renombre) (renombre[1] === 'TO' ? cambios.suman : cambios.restan).push(renombre[2]);
      continue;
    }
    const requirement = ENCABEZADO_REQUIREMENT.exec(linea);
    if (requirement) (seccion === 'REMOVED' ? cambios.restan : cambios.suman).push(requirement[1]);
  }
  return cambios;
};

const subdirectorios = (directorio: string): string[] =>
  existsSync(directorio)
    ? readdirSync(directorio, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];

const leerSpec = (archivo: string): Cambios =>
  existsSync(archivo) ? cambiosDeTexto(readFileSync(archivo, 'utf-8')) : { suman: [], restan: [] };

export const requirementsVigentes = (raizOpenspec: string): Vigentes => {
  const suman: Record<string, string[]> = {};
  const restan: Record<string, string[]> = {};
  const acumular = (cap: string, cambios: Cambios) => {
    (suman[cap] ??= []).push(...cambios.suman);
    (restan[cap] ??= []).push(...cambios.restan);
  };

  for (const cap of subdirectorios(path.join(raizOpenspec, 'specs'))) {
    acumular(cap, leerSpec(path.join(raizOpenspec, 'specs', cap, 'spec.md')));
  }
  const cambios = path.join(raizOpenspec, 'changes');
  for (const cambio of subdirectorios(cambios)) {
    for (const cap of subdirectorios(path.join(cambios, cambio, 'specs'))) {
      acumular(cap, leerSpec(path.join(cambios, cambio, 'specs', cap, 'spec.md')));
    }
  }

  return Object.fromEntries(
    Object.entries(suman).map(([cap, nombres]) => [
      cap,
      [...new Set(nombres)].filter((nombre) => !restan[cap].includes(nombre)),
    ]),
  );
};

export const citas = (archivos: Fuente[]): Cita[] =>
  archivos.flatMap(({ ruta, texto }) =>
    [...texto.matchAll(CITA)].map((m) => ({ cap: m[2], requirement: m[3], archivo: ruta })),
  );

const enCapa = (cita: Cita) => CAPAS.some((capa) => capa.test(cita.archivo));

export const hallazgos = (vigentes: Vigentes, todas: Cita[], propias: string[]): Hallazgos => {
  const resuelve = (cita: Cita) => vigentes[cita.cap]?.includes(cita.requirement) ?? false;
  const cubiertas = todas.filter((cita) => enCapa(cita) && resuelve(cita));
  return {
    noResuelven: todas.filter((cita) => !resuelve(cita)),
    sinCita: propias.flatMap((cap) =>
      (vigentes[cap] ?? [])
        .filter((requirement) => !cubiertas.some((c) => c.cap === cap && c.requirement === requirement))
        .map((requirement) => ({ cap, requirement })),
    ),
    fueraDeCapa: todas.filter((cita) => !enCapa(cita)),
    capacidadesInexistentes: propias.filter((cap) => !(cap in vigentes)),
  };
};
