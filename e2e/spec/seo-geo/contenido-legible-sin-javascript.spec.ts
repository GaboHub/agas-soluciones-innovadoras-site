import { expect, test } from '@playwright/test';
import textos from '../../../src/data/textos-productos.json' with { type: 'json' };
import { construirGruposFicha, linkInicial } from '../../../src/lib/ficha';
import { formatearPrecioCLP, formatearFecha } from '../../../src/lib/formato';
import { muestras } from '../_muestras';

test.use({ javaScriptEnabled: false });

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();

test.describe('[seo-geo] Contenido legible sin JavaScript', () => {
  test('Ficha sin JavaScript', async ({ page }) => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const documento = normalizar((await page.locator('body').textContent()) ?? '');
      const { gruposFicha } = construirGruposFicha(ficha as never);
      expect(documento, ficha.slug).toContain(ficha.titulo);
      expect(documento, ficha.slug).toContain(normalizar((textos as Record<string, { descripcion: string }>)[ficha.slug].descripcion));
      expect(documento, ficha.slug).toContain(formatearPrecioCLP(ficha.precioReferencial));
      expect(documento, ficha.slug).toContain(`Precio referencial al ${formatearFecha(ficha.fechaPrecio)}`);
      for (const grupo of gruposFicha) {
        for (const opcion of grupo.opciones) expect(documento, `${ficha.slug}: ${opcion.nombre}`).toContain(opcion.nombre);
      }
      await expect(page.locator(`a[href="${linkInicial(gruposFicha)}"]`).first(), ficha.slug).toBeAttached();
      await expect(page.locator('a[href*="mercadolibre.cl"]').first(), ficha.slug).toBeAttached();
    }
  });
});
