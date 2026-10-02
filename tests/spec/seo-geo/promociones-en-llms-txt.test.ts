import { describe, expect, it } from 'vitest';
import { construirLlmsTxt } from '../../../src/lib/llms';
import { entradaDePrueba, promocionesDePrueba } from './_llms';

const seccionPromociones = (texto: string) => {
  const lineas = texto.split('\n');
  const inicio = lineas.indexOf('## Promociones');
  const fin = lineas.indexOf('## Más información');
  return lineas.slice(inicio, fin);
};

describe('[seo-geo] Promociones en llms.txt', () => {
  it('Campaña próxima', () => {
    const seccion = seccionPromociones(construirLlmsTxt(entradaDePrueba({ hoy: '2031-03-15' })));
    expect(seccion).toContain('- Campaña: Campaña de prueba (próximamente del 01-04-2031 al 30-04-2031)');
    expect(seccion.join('\n')).not.toContain('vigente del 01-04-2031');
  });

  it('Campaña vencida', () => {
    const seccion = seccionPromociones(construirLlmsTxt(entradaDePrueba({ hoy: '2031-05-01' })));
    expect(seccion.join('\n')).not.toContain('Campaña de prueba');
  });

  it('enlaza la página de promociones y lista el cupón vigente con su porcentaje', () => {
    const seccion = seccionPromociones(construirLlmsTxt(entradaDePrueba({ hoy: '2031-03-15' })));
    expect(seccion.join('\n')).toContain('https://agassoluciones.cl/promociones/');
    expect(seccion).toContain('- Cupón: Cupón de prueba, 17% (vigente del 10-03-2031 al 20-03-2031)');
  });

  it('el último día de una campaña sigue vigente', () => {
    const seccion = seccionPromociones(construirLlmsTxt(entradaDePrueba({ hoy: '2031-04-30' })));
    expect(seccion).toContain('- Campaña: Campaña de prueba (vigente del 01-04-2031 al 30-04-2031)');
  });

  it('lista primero los cupones y luego las campañas', () => {
    const seccion = seccionPromociones(construirLlmsTxt(entradaDePrueba({ hoy: '2031-03-15' })));
    const items = seccion.filter((linea) => linea.startsWith('- '));
    expect(items).toEqual([
      '- Cupón: Cupón de prueba, 17% (vigente del 10-03-2031 al 20-03-2031)',
      '- Campaña: Campaña de prueba (próximamente del 01-04-2031 al 30-04-2031)',
    ]);
  });

  it('sin publicables dice que no hay promociones activas', () => {
    const seccion = seccionPromociones(
      construirLlmsTxt(entradaDePrueba({ hoy: '2032-01-01', promociones: promocionesDePrueba })),
    );
    expect(seccion.filter((linea) => linea.startsWith('- '))).toEqual([]);
    expect(seccion).toContain('No hay promociones activas en este momento.');
    expect(seccion.join('\n')).toContain('https://agassoluciones.cl/promociones/');
  });
});
