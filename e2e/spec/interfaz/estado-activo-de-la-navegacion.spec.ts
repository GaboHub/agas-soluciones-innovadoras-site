import { expect, test, type Page } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const casos = [
  { ruta: '/', activo: 'Inicio' },
  { ruta: '/productos/', activo: 'Productos' },
  { ruta: `/productos/${muestras.fichaSimple.slug}/`, activo: 'Productos' },
  { ruta: `/categorias/${site.categorias[0].slug}/`, activo: 'Productos' },
  { ruta: '/promociones/', activo: 'Promociones' },
  { ruta: '/guias/', activo: 'Guías' },
  { ruta: `/guias/${muestras.guia.slug}/`, activo: 'Guías' },
  { ruta: '/preguntas-frecuentes/', activo: 'Preguntas frecuentes' },
  { ruta: '/contacto/', activo: 'Contacto' },
];

const navegaciones = ['Navegación principal', 'Navegación móvil'];

const leerEnlaces = (page: Page, nombre: string) =>
  page.getByRole('navigation', { name: nombre, includeHidden: true }).evaluate((nav) =>
    [...nav.querySelectorAll('a')]
      .filter((enlace) => !enlace.hasAttribute('target'))
      .map((enlace) => {
        const estilo = getComputedStyle(enlace);
        return {
          nombre: enlace.textContent!.trim(),
          actual: enlace.getAttribute('aria-current'),
          subrayado: estilo.textDecorationLine.includes('underline'),
          borde: estilo.borderBottomStyle !== 'none' && parseFloat(estilo.borderBottomWidth) >= 2,
        };
      }),
  );

test.describe('[interfaz] Estado activo de la navegación', () => {
  for (const { ruta, activo } of casos) {
    for (const navegacion of navegaciones) {
      test(`${ruta}: «${activo}» activo en ${navegacion}`, async ({ page }) => {
        await page.goto(ruta);
        const enlaces = await leerEnlaces(page, navegacion);
        expect(enlaces.length).toBe(6);
        const marcados = enlaces.filter((enlace) => enlace.actual === 'page');
        expect(marcados.map((enlace) => enlace.nombre)).toEqual([activo]);
        expect(marcados[0].subrayado || marcados[0].borde).toBe(true);
        for (const otro of enlaces.filter((enlace) => enlace.actual !== 'page')) {
          expect(otro.subrayado || otro.borde, `${otro.nombre} sin indicador`).toBe(false);
        }
      });
    }
  }
});
