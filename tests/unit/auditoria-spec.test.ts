import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { citas, hallazgos, requirementsVigentes } from '../spec/auditoria';

const requirement = (nombre: string) => `### Requirement: ${nombre}\nTexto.\n\n#### Scenario: uno\n- **WHEN** a\n- **THEN** b\n`;
const cita = (cap: string, nombre: string) => `describe('[${cap}] ${nombre}', () => {});`;

let raiz: string;

const escribir = (relativa: string, contenido: string) => {
  const destino = path.join(raiz, relativa);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
};

beforeEach(() => {
  raiz = mkdtempSync(path.join(tmpdir(), 'auditoria-'));
});

afterEach(() => {
  rmSync(raiz, { recursive: true, force: true });
});

describe('requirementsVigentes', () => {
  it('lee los requirements de la spec viva por capability', () => {
    escribir('specs/sitio/spec.md', `## Requirements\n\n${requirement('Home')}\n${requirement('Rutas')}`);
    escribir('specs/marca/spec.md', requirement('Logo'));
    expect(requirementsVigentes(raiz)).toEqual({ sitio: ['Home', 'Rutas'], marca: ['Logo'] });
  });

  it('suma los ADDED y MODIFIED de los deltas en vuelo', () => {
    escribir('specs/sitio/spec.md', requirement('Home'));
    escribir(
      'changes/uno/specs/sitio/spec.md',
      `## ADDED Requirements\n\n${requirement('Nuevo')}\n## MODIFIED Requirements\n\n${requirement('Modificado')}`,
    );
    expect(requirementsVigentes(raiz)).toEqual({ sitio: ['Home', 'Nuevo', 'Modificado'] });
  });

  it('crea la capability que solo existe en un delta', () => {
    escribir('changes/uno/specs/barrido/spec.md', `## ADDED Requirements\n\n${requirement('Token')}`);
    expect(requirementsVigentes(raiz)).toEqual({ barrido: ['Token'] });
  });

  it('descuenta los REMOVED', () => {
    escribir('specs/sitio/spec.md', `${requirement('Home')}\n${requirement('Viejo')}`);
    escribir('changes/uno/specs/sitio/spec.md', `## REMOVED Requirements\n\n### Requirement: Viejo\n**Reason**: ya no vale.\n`);
    expect(requirementsVigentes(raiz)).toEqual({ sitio: ['Home'] });
  });

  it('reemplaza el nombre viejo por el nuevo en un RENAMED', () => {
    escribir('specs/sitio/spec.md', requirement('Nombre viejo'));
    escribir(
      'changes/uno/specs/sitio/spec.md',
      '## RENAMED Requirements\n\n- FROM: `### Requirement: Nombre viejo`\n- TO: `### Requirement: Nombre nuevo`\n',
    );
    expect(requirementsVigentes(raiz)).toEqual({ sitio: ['Nombre nuevo'] });
  });

  it('ignora changes/archive', () => {
    escribir('specs/sitio/spec.md', requirement('Home'));
    escribir('changes/archive/2026-01-01-uno/specs/sitio/spec.md', `## ADDED Requirements\n\n${requirement('Archivado')}`);
    expect(requirementsVigentes(raiz)).toEqual({ sitio: ['Home'] });
  });

  it('devuelve vacío cuando no hay specs', () => {
    expect(requirementsVigentes(raiz)).toEqual({});
  });
});

describe('citas', () => {
  it('extrae la capability y el requirement del describe raíz con cada tipo de comilla', () => {
    const archivos = [
      { ruta: 'tests/spec/sitio/home.test.ts', texto: `${cita('sitio', 'Home')}\n` },
      { ruta: 'tests/spec/sitio/rutas.test.ts', texto: 'describe("[sitio] Rutas generadas", () => {});\n' },
      { ruta: 'e2e/spec/sitio/burbuja.spec.ts', texto: 'test.describe(`[sitio] Burbuja`, () => {});\n' },
    ];
    expect(citas(archivos)).toEqual([
      { cap: 'sitio', requirement: 'Home', archivo: 'tests/spec/sitio/home.test.ts' },
      { cap: 'sitio', requirement: 'Rutas generadas', archivo: 'tests/spec/sitio/rutas.test.ts' },
      { cap: 'sitio', requirement: 'Burbuja', archivo: 'e2e/spec/sitio/burbuja.spec.ts' },
    ]);
  });

  it('ignora los describe anidados y los que no llevan capability entre corchetes', () => {
    const texto = `describe('suite normal', () => {\n  ${cita('sitio', 'Anidado')}\n});\n`;
    expect(citas([{ ruta: 'tests/unit/x.test.ts', texto }])).toEqual([]);
  });
});

describe('hallazgos', () => {
  const vigentes = { sitio: ['Home', 'Rutas'], marca: ['Logo'] };
  const valida = { cap: 'sitio', requirement: 'Home', archivo: 'tests/spec/sitio/home.test.ts' };

  it('no reporta nada cuando todo resuelve, está en la capa y cubre las propias', () => {
    const todas = [valida, { cap: 'sitio', requirement: 'Rutas', archivo: 'e2e/spec/sitio/rutas.spec.ts' }];
    expect(hallazgos(vigentes, todas, ['sitio'])).toEqual({ noResuelven: [], sinCita: [], fueraDeCapa: [], capacidadesInexistentes: [] });
  });

  it('reporta la cita que no resuelve', () => {
    const inventada = { cap: 'sitio', requirement: 'No existe', archivo: 'tests/spec/sitio/x.test.ts' };
    expect(hallazgos(vigentes, [valida, inventada], []).noResuelven).toEqual([inventada]);
  });

  it('reporta la cita cuya capability no existe', () => {
    const otra = { cap: 'fantasma', requirement: 'Home', archivo: 'tests/spec/fantasma/x.test.ts' };
    expect(hallazgos(vigentes, [otra], []).noResuelven).toEqual([otra]);
  });

  it('reporta el requirement propio sin cita y no el de una capability ajena', () => {
    expect(hallazgos(vigentes, [valida], ['sitio']).sinCita).toEqual([{ cap: 'sitio', requirement: 'Rutas' }]);
  });

  it('no cuenta como cobertura una cita fuera de la capa', () => {
    const fuera = { cap: 'marca', requirement: 'Logo', archivo: 'tests/unit/logo.test.ts' };
    expect(hallazgos(vigentes, [fuera], ['marca']).sinCita).toEqual([{ cap: 'marca', requirement: 'Logo' }]);
  });

  it('reporta la cita válida fuera de tests/spec y e2e/spec', () => {
    const fuera = { cap: 'sitio', requirement: 'Home', archivo: 'tests/unit/home.test.ts' };
    const otraFuera = { cap: 'sitio', requirement: 'Rutas', archivo: 'e2e/home.spec.ts' };
    const resultado = hallazgos(vigentes, [fuera, otraFuera], []);
    expect(resultado.fueraDeCapa).toEqual([fuera, otraFuera]);
    expect(resultado.noResuelven).toEqual([]);
  });

  it('reporta la cita en un archivo de la capa que ningún runner ejecuta', () => {
    const archivos = [
      'tests/spec/sitio/home.spec.ts',
      'tests/spec/sitio/_ayuda.ts',
      'e2e/spec/sitio/home.test.ts',
      'e2e/spec/sitio/_ayuda.ts',
    ];
    const citasEnArchivosMudos = archivos.map((archivo) => ({ ...valida, archivo }));
    const resultado = hallazgos(vigentes, citasEnArchivosMudos, ['sitio']);
    expect(resultado.fueraDeCapa).toEqual(citasEnArchivosMudos);
    expect(resultado.sinCita).toContainEqual({ cap: 'sitio', requirement: 'Home' });
  });

  it('acepta las citas en tests/spec/**/*.test.ts y e2e/spec/**/*.spec.ts', () => {
    const profundas = [
      { ...valida, archivo: 'tests/spec/sitio/profundo/home.test.ts' },
      { ...valida, archivo: 'e2e/spec/sitio/profundo/home.spec.ts' },
    ];
    expect(hallazgos(vigentes, profundas, []).fueraDeCapa).toEqual([]);
  });

  it('reporta la capability propia que no existe en el universo', () => {
    expect(hallazgos(vigentes, [valida], ['sitioo', 'sitio']).capacidadesInexistentes).toEqual(['sitioo']);
    expect(hallazgos(vigentes, [valida], ['sitio']).capacidadesInexistentes).toEqual([]);
  });

  it('un requirement removido deja de resolver', () => {
    const removida = { cap: 'sitio', requirement: 'Viejo', archivo: 'tests/spec/sitio/viejo.test.ts' };
    expect(hallazgos(vigentes, [removida], []).noResuelven).toEqual([removida]);
  });
});
