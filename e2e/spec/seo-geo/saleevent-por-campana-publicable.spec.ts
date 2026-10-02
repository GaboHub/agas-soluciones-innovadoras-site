import { expect, test } from '@playwright/test';
import { getCampanasPublicables } from '../../../src/lib/promociones';
import site from '../../../src/data/site.json' with { type: 'json' };
import { bloquesJsonLd } from '../_jsonld';

const campanas = getCampanasPublicables();

test.describe('[seo-geo] SaleEvent por campaña publicable', () => {
  test('Un SaleEvent por campaña publicable en el build real', async ({ page }) => {
    test.skip(campanas.length === 0, 'sin campañas publicables a la fecha de build no hay SaleEvent');
    await page.goto('/promociones/');
    const eventos = (await bloquesJsonLd(page)).filter((bloque) => bloque['@type'] === 'SaleEvent');
    expect(eventos.map((evento) => evento.name)).toEqual(campanas.map((campana) => campana.nombre));
    for (const campana of campanas) {
      const evento = eventos.find((candidato) => candidato.name === campana.nombre)!;
      expect(evento.description).toBe(campana.descripcion);
      expect(evento.startDate).toBe(campana.desde);
      expect(evento.endDate).toBe(campana.hasta);
      expect(evento.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
      expect(evento.location).toEqual({ '@type': 'VirtualLocation', url: site.mercadolibre.tienda });
      expect(evento).not.toHaveProperty('offers');
      expect(JSON.stringify(evento)).not.toMatch(/price|precio/i);
    }
  });
});
