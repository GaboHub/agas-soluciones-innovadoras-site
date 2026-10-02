import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import site from '../../../src/data/site.json';
import { RAIZ_REPO } from './_arnes';
import { verificarConsistencia } from './_consistencia';

const fichasReales = readdirSync(path.join(RAIZ_REPO, 'content/productos'))
  .filter((archivo) => archivo.endsWith('.md'))
  .map((archivo) => matter(readFileSync(path.join(RAIZ_REPO, 'content/productos', archivo), 'utf-8')).data as { slug: string; categoria: string });

const sitioDePrueba = {
  categorias: [
    { slug: 'audio', productos: ['a', 'b'] },
    { slug: 'nintendo-switch', productos: ['c'] },
  ],
};
const fichasDePrueba = [
  { slug: 'a', categoria: 'audio' },
  { slug: 'b', categoria: 'audio' },
  { slug: 'c', categoria: 'nintendo-switch' },
];

describe('[catalogo] Consistencia de categorías y fichas', () => {
  it('el sitio real declara cada ficha exactamente una vez y en su categoría', () => {
    expect(fichasReales.length).toBeGreaterThan(0);
    expect(verificarConsistencia(site, fichasReales)).toEqual([]);
    expect(verificarConsistencia(sitioDePrueba, fichasDePrueba)).toEqual([]);
  });

  it('Ficha nueva sin declarar', () => {
    const errores = verificarConsistencia(sitioDePrueba, [...fichasDePrueba, { slug: 'nueva', categoria: 'audio' }]);
    expect(errores).toEqual(['ficha sin declarar en site.json: nueva']);
  });

  it('Categoría discordante', () => {
    const errores = verificarConsistencia(sitioDePrueba, [
      { slug: 'a', categoria: 'nintendo-switch' },
      { slug: 'b', categoria: 'audio' },
      { slug: 'c', categoria: 'nintendo-switch' },
    ]);
    expect(errores).toEqual(['categoría discordante en a: ficha nintendo-switch, site.json audio']);
  });

  it('un slug declarado sin ficha falla', () => {
    expect(verificarConsistencia(sitioDePrueba, fichasDePrueba.slice(0, 2))).toEqual(['slug declarado sin ficha: c']);
  });

  it('una ficha declarada dos veces falla', () => {
    const duplicado = { categorias: [...sitioDePrueba.categorias, { slug: 'otros', productos: ['a'] }] };
    expect(verificarConsistencia(duplicado, fichasDePrueba)).toEqual(['ficha declarada 2 veces: a']);
  });
});
