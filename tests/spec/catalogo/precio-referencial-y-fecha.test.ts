import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { borrar, crearContexto, crearRaizCurada, FIXTURE_BARRIDO, generar, generarAparte, leerFicha, SLUG_MAP_FIXTURE } from './_arnes';

type Miembro = { precio: number };

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

const fechaDeFixture = readFileSync(path.join(FIXTURE_BARRIDO, 'empresa.md'), 'utf-8').match(/_Generado el (\d{4}-\d{2}-\d{2})/)![1];

describe('[catalogo] Precio referencial y fecha', () => {
  it('Precio con original', () => {
    expect(leerFicha(raiz, 'precio-original').data.precioReferencial).toBe(10000);
  });

  it('sin original publica el precio como entero', () => {
    expect(leerFicha(raiz, 'lamina-fixture').data.precioReferencial).toBe(4490);
  });

  it('una familia toma el precio de su primer miembro activo y cada miembro el suyo', () => {
    const ficha = leerFicha(raiz, 'audifonos-fixture');
    expect(ficha.data.precioReferencial).toBe(7990);
    expect((ficha.data.miembros as Miembro[]).map((miembro) => miembro.precio)).toEqual([7990, 8990, 9990, 6990, 5990]);
  });

  it('una familia agrupada toma el precio de su primer miembro', async () => {
    const otro = await crearContexto();
    try {
      const publicacion = path.join(otro, 'publicaciones/familia-kit-fundas-fixture/publicacion.md');
      const precios = ['$8.990', '$6.990', '$10.990', '$7.990', '$9.990'];
      let indice = 0;
      writeFileSync(
        publicacion,
        readFileSync(publicacion, 'utf-8').replace(/- \*\*Precio:\*\* \$[\d.]+/g, () => `- **Precio:** ${precios[indice++]}`),
      );
      expect(indice).toBe(precios.length);
      const entrada = SLUG_MAP_FIXTURE.filter((candidata) => candidata.prefijo === 'familia-kit-fundas-fixture');
      expect(entrada).toHaveLength(1);
      const resultado = await generarAparte(entrada, otro);
      expect(resultado.ficha('kit-fundas-fixture').data.precioReferencial).toBe(8990);
    } finally {
      borrar(otro);
    }
  });

  it('Fecha del barrido', async () => {
    expect(fechaDeFixture).toBe('2031-03-09');
    expect(leerFicha(raiz, 'lamina-fixture').data.fechaPrecio).toBe(fechaDeFixture);
    const otro = await crearContexto();
    try {
      const empresa = path.join(otro, 'empresa.md');
      writeFileSync(empresa, readFileSync(empresa, 'utf-8').replace(/_Generado el .+_/, '_Generado el 2026-10-01 00:17:16_'));
      const resultado = await generarAparte(SLUG_MAP_FIXTURE, otro);
      expect(resultado.ficha('lamina-fixture').data.fechaPrecio).toBe('2026-10-01');
      expect(resultado.ficha('audifonos-fixture').data.fechaPrecio).toBe('2026-10-01');
    } finally {
      borrar(otro);
    }
  });
});
