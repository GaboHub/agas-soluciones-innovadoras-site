import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPACIDADES_PROPIAS } from './auditoria/propias';
import { citas, hallazgos, requirementsVigentes } from './auditoria';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const archivosTs = (directorio: string): string[] =>
  readdirSync(path.join(raiz, directorio), { withFileTypes: true }).flatMap((entrada) => {
    const relativa = `${directorio}/${entrada.name}`;
    if (entrada.isDirectory()) return entrada.name === 'node_modules' ? [] : archivosTs(relativa);
    return entrada.name.endsWith('.ts') ? [relativa] : [];
  });

const fuentes = ['tests', 'e2e'].flatMap(archivosTs).map((ruta) => ({
  ruta,
  texto: readFileSync(path.join(raiz, ruta), 'utf-8'),
}));

const vigentes = requirementsVigentes(path.join(raiz, 'openspec'));
const resultado = hallazgos(vigentes, citas(fuentes), CAPACIDADES_PROPIAS);

const listar = (titulo: string, lineas: string[]) => `${titulo}:\n${lineas.map((l) => `  ${l}`).join('\n')}`;

describe('auditoría de los tests de spec', () => {
  it('el universo de requirements no está vacío', () => {
    expect(Object.keys(vigentes).length).toBeGreaterThan(0);
  });

  it('el escaneo recorre tests/ y e2e/ completos', () => {
    const rutas = fuentes.map((fuente) => fuente.ruta);
    expect(rutas).toContain('tests/unit/auditoria-spec.test.ts');
    expect(rutas).toContain('tests/spec/auditoria.test.ts');
    expect(rutas.filter((ruta) => ruta.startsWith('e2e/') && !ruta.startsWith('e2e/spec/')).length).toBeGreaterThan(0);
  });

  it('el escaneo incluye archivos con cita en tests/spec y en e2e/spec', () => {
    const conCita = new Set(citas(fuentes).map((cita) => cita.archivo));
    expect([...conCita].some((ruta) => ruta.startsWith('tests/spec/'))).toBe(true);
    expect([...conCita].some((ruta) => ruta.startsWith('e2e/spec/'))).toBe(true);
  });

  it('toda capability propia existe en el universo', () => {
    expect(resultado.capacidadesInexistentes, listar('Capabilities propias inexistentes', resultado.capacidadesInexistentes)).toEqual([]);
  });

  it('toda cita resuelve a un requirement vigente', () => {
    const lineas = resultado.noResuelven.map((c) => `[${c.cap}] ${c.requirement} (${c.archivo})`);
    expect(lineas, listar('Citas que no resuelven', lineas)).toEqual([]);
  });

  it('todo requirement de las capabilities propias tiene un test de spec', () => {
    const lineas = resultado.sinCita.map((c) => `[${c.cap}] ${c.requirement}`);
    expect(lineas, listar('Requirements sin test de spec', lineas)).toEqual([]);
  });

  it('toda cita vive en tests/spec o e2e/spec', () => {
    const lineas = resultado.fueraDeCapa.map((c) => `[${c.cap}] ${c.requirement} (${c.archivo})`);
    expect(lineas, listar('Citas fuera de la capa de spec', lineas)).toEqual([]);
  });
});
