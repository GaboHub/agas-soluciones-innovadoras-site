import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, generar, generarAparte, leerFicha, slugsGenerados, SLUG_MAP_FIXTURE } from './_arnes';

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

describe('[catalogo] Condición del producto', () => {
  it('Producto nuevo', () => {
    expect(leerFicha(raiz, 'lamina-fixture').data.condicion).toBe('new');
  });

  it('emite el valor de Condición del barrido', () => {
    expect(leerFicha(raiz, 'precio-original').data.condicion).toBe('refurbished');
  });

  it('una familia toma la condición de su primer miembro activo', () => {
    expect(leerFicha(raiz, 'audifonos-fixture').data.condicion).toBe('new');
    expect(leerFicha(raiz, 'kit-fundas-fixture').data.condicion).toBe('new');
  });

  it('la familia toma la condición de su primer miembro activo aunque los demás difieran', async () => {
    const casos = [
      { prefijo: 'familia-audifonos-fixture', slug: 'audifonos-fixture', condiciones: ['used', 'refurbished', 'new', 'used', 'new', 'new'], esperada: 'refurbished' },
      { prefijo: 'familia-kit-fundas-fixture', slug: 'kit-fundas-fixture', condiciones: ['refurbished', 'used', 'used', 'used', 'new'], esperada: 'refurbished' },
    ];
    for (const caso of casos) {
      const otro = await crearContexto();
      try {
        const publicacion = path.join(otro, 'publicaciones', caso.prefijo, 'publicacion.md');
        let indice = 0;
        writeFileSync(
          publicacion,
          readFileSync(publicacion, 'utf-8').replace(/- \*\*Condición:\*\* \w+/g, () => `- **Condición:** ${caso.condiciones[indice++]}`),
        );
        expect(indice, caso.prefijo).toBe(caso.condiciones.length);
        const entrada = SLUG_MAP_FIXTURE.filter((candidata) => candidata.prefijo === caso.prefijo);
        expect(entrada, caso.prefijo).toHaveLength(1);
        const resultado = await generarAparte(entrada, otro);
        expect(resultado.ficha(caso.slug).data.condicion, caso.slug).toBe(caso.esperada);
      } finally {
        borrar(otro);
      }
    }
  });

  it('toda ficha generada declara una condición válida', () => {
    for (const slug of slugsGenerados(raiz)) {
      expect(['new', 'used', 'refurbished']).toContain(leerFicha(raiz, slug).data.condicion);
    }
  });
});
