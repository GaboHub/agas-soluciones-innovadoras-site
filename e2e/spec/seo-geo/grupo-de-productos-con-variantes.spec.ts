import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { construirGruposFicha } from '../../../src/lib/ficha';
import { esperarHidratacion } from '../_hidratacion';
import { bloquesJsonLd } from '../_jsonld';
import { elegir, enlaceDelCta } from '../_selector';
import { muestras } from '../_muestras';

const claveDeImagen = (url: string) =>
  new URL(url, 'http://localhost').pathname.split('/').pop()!.replace(/\.[a-z]+$/, '').replace(/_[^_]+$/, '');

const prefijoDeImagenes = `https://${site.dominio}/_astro/`;

const conOpciones = muestras.fichas.filter((ficha) => ficha.tipo !== 'simple');

test.describe('[seo-geo] Grupo de productos con variantes', () => {
  test('Opciones iguales al selector', async ({ page }) => {
    test.slow();
    expect(conOpciones.length).toBeGreaterThan(0);
    for (const ficha of conOpciones) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const grupo = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'ProductGroup');
      expect(grupo, ficha.slug).toBeDefined();
      expect(grupo!.productGroupID, ficha.slug).toBe(ficha.slug);
      const variantes = grupo!.hasVariant as { offers: { url: string }; image?: string }[];
      const urlsDeVariantes = variantes.map((v) => v.offers.url);

      const { gruposFicha, etiquetaGrupo, etiquetaOpcion } = construirGruposFicha(ficha as never);
      const enSelector: string[] = [];
      const imagenPorEnlace = new Map<string, string>();
      for (const [indiceGrupo, grupoFicha] of gruposFicha.entries()) {
        if (gruposFicha.length > 1) await elegir(page, etiquetaGrupo, indiceGrupo);
        for (const indiceOpcion of grupoFicha.opciones.keys()) {
          if (grupoFicha.opciones.length > 1) await elegir(page, etiquetaOpcion, indiceOpcion);
          const enlace = (await enlaceDelCta(page))!;
          enSelector.push(enlace);
          imagenPorEnlace.set(enlace, claveDeImagen((await page.locator('main img[fetchpriority="high"]').getAttribute('src'))!));
        }
      }
      expect(enSelector, ficha.slug).toEqual(urlsDeVariantes);
      for (const variante of variantes) {
        expect(variante.image, `${ficha.slug}: ${variante.offers.url}`).toBeDefined();
        expect(variante.image!.startsWith(prefijoDeImagenes), `${ficha.slug}: ${variante.image}`).toBe(true);
        expect(claveDeImagen(variante.image!), `${ficha.slug}: ${variante.offers.url}`).toBe(imagenPorEnlace.get(variante.offers.url));
      }
      for (const imagen of new Set(variantes.map((variante) => variante.image!))) {
        const respuesta = await page.request.get(new URL(imagen).pathname);
        expect(respuesta.status(), imagen).toBe(200);
        expect(respuesta.headers()['content-type'], imagen).toMatch(/^image\//);
      }
    }
  });
});
