import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { borrar, crearContexto, crearRaizCurada, FIXTURE_BARRIDO, generar } from './_arnes';

let contexto: string;
let raiz: string;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

const archivosDeFixture = (directorio: string): string[] =>
  readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) =>
    entrada.isDirectory() ? archivosDeFixture(path.join(directorio, entrada.name)) : [path.join(directorio, entrada.name)],
  );

describe('[catalogo] Fichas sin stock', () => {
  it('Stock en el barrido', () => {
    const publicaciones = archivosDeFixture(path.join(FIXTURE_BARRIDO, 'publicaciones')).filter((ruta) => ruta.endsWith('.md'));
    for (const publicacion of publicaciones) {
      const texto = readFileSync(publicacion, 'utf-8');
      expect(texto).toContain('7351');
      expect(texto).toContain('4286');
    }
    const fichas = readdirSync(path.join(raiz, 'content/productos'));
    expect(fichas.length).toBeGreaterThan(0);
    for (const ficha of fichas) {
      const texto = readFileSync(path.join(raiz, 'content/productos', ficha), 'utf-8');
      expect(texto, ficha).not.toMatch(/7351|7352|4286/);
      expect(texto, ficha).not.toMatch(/stock|vendidos|disponible/i);
    }
    expect(readFileSync(path.join(raiz, 'src/data/resenas.json'), 'utf-8')).not.toMatch(/7351|7352|4286|stock/i);
  });
});
