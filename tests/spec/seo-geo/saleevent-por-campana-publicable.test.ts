import { describe, expect, it } from 'vitest';
import { publicables } from '../../../src/lib/promociones';
import { buildSaleEvent } from '../../../src/lib/seo';
import { site } from '../../../src/lib/site';
import { promocionesDePrueba } from '../promociones/_datos';

describe('[seo-geo] SaleEvent por campaña publicable', () => {
  it('Campaña próxima', () => {
    const proximas = publicables(promocionesDePrueba.campanas, '2031-03-01').filter(
      (campana) => campana.estado === 'proxima',
    );
    expect(proximas).toHaveLength(promocionesDePrueba.campanas.length);
    const eventos = proximas.map(buildSaleEvent);
    for (const campana of proximas) {
      const evento = eventos.find((candidato) => candidato.name === campana.nombre);
      expect(evento).toMatchObject({
        '@type': 'SaleEvent',
        description: campana.descripcion,
        startDate: campana.desde,
        endDate: campana.hasta,
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: site.mercadolibre.tienda },
      });
      expect(evento).not.toHaveProperty('offers');
      expect(JSON.stringify(evento)).not.toMatch(/price|precio/i);
    }
  });
});
