import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { borrar, crearContexto, crearRaizCurada, FIXTURE_BARRIDO, generar, hashDeArbol } from '../catalogo/_arnes';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const archivos = (directorio: string, extensiones: string[]): string[] =>
  readdirSync(path.resolve(raiz, directorio), { withFileTypes: true }).flatMap((entrada) => {
    const relativa = `${directorio}/${entrada.name}`;
    if (entrada.isDirectory()) return archivos(relativa, extensiones);
    return extensiones.some((extension) => entrada.name.endsWith(extension)) ? [relativa] : [];
  });

const que = (relativa: string) => readFileSync(path.resolve(raiz, relativa), 'utf-8');

const PROMOCION_DEL_BARRIDO = 'Campaña Fantasma del Barrido';

let contexto: string;
let raizTemporal: string;

beforeAll(async () => {
  contexto = await crearContexto();
  raizTemporal = crearRaizCurada();
});

afterAll(() => {
  borrar(contexto, raizTemporal);
});

describe('[promociones] Fuente única curada', () => {
  it('Scripts no lo tocan', async () => {
    const antes = hashDeArbol(raizTemporal, ['content/productos', 'src/assets/images/productos', 'src/data/resenas.json']);
    const promocionesAntes = que('src/data/promociones.json');
    await generar({ contexto, raiz: raizTemporal });
    expect(hashDeArbol(raizTemporal, ['content/productos', 'src/assets/images/productos', 'src/data/resenas.json'])).toBe(antes);
    expect(que('src/data/promociones.json')).toBe(promocionesAntes);
  });

  it('ningún script del repo menciona promociones.json', () => {
    const scripts = archivos('scripts', ['.mjs', '.py', '.sh']);
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((script) => que(script).includes('promociones.json'))).toEqual([]);
  });

  it('Promoción solo en el barrido', async () => {
    const publicaciones = archivos(path.join(FIXTURE_BARRIDO, 'publicaciones'), ['.md']);
    expect(publicaciones.every((publicacion) => que(publicacion).includes(PROMOCION_DEL_BARRIDO))).toBe(true);
    await generar({ contexto, raiz: raizTemporal });
    const salidas = archivos(path.join(raizTemporal, 'content/productos'), ['.md']);
    expect(salidas.length).toBeGreaterThan(0);
    for (const salida of salidas) expect(que(salida)).not.toContain(PROMOCION_DEL_BARRIDO);
    expect(que(path.join(raizTemporal, 'src/data/resenas.json'))).not.toContain(PROMOCION_DEL_BARRIDO);
  });

  it('ninguna superficie del sitio lee otra fuente de promociones', () => {
    const fuentes = archivos('src', ['.ts', '.tsx', '.astro', '.mjs']);
    expect(fuentes.filter((fuente) => que(fuente).includes('promociones.json'))).toEqual(['src/lib/promociones.ts']);
    expect(fuentes.filter((fuente) => /agas-context|exportar-contexto/.test(que(fuente)))).toEqual([]);
  });
});
