import { expect, test } from '@playwright/test';
import { getCampanasPublicables, getCuponesPublicables } from '../../../src/lib/promociones';

const fecha = (iso: string) => iso.split('-').reverse().join('-');
const estado = (valor: string) => (valor === 'proxima' ? 'próximamente' : 'vigente');
const cupones = getCuponesPublicables();
const campanas = getCampanasPublicables();

test.describe('[seo-geo] Promociones en llms.txt', () => {
  test('Campaña próxima y vencida: la sección lista exactamente las publicables', async ({ request }) => {
    const texto = await (await request.get('/llms.txt')).text();
    const seccion = texto.split('## Promociones')[1].split('## ')[0];
    expect(seccion).toContain('https://agassoluciones.cl/promociones/');
    const esperadas = [
      ...cupones.map(
        (c) => `- Cupón: ${c.nombre}, ${c.porcentaje}% (${estado(c.estado)} del ${fecha(c.desde)} al ${fecha(c.hasta)})`,
      ),
      ...campanas.map((c) => `- Campaña: ${c.nombre} (${estado(c.estado)} del ${fecha(c.desde)} al ${fecha(c.hasta)})`),
    ];
    expect(seccion.split('\n').filter((linea) => linea.startsWith('- '))).toEqual(esperadas);
    if (esperadas.length === 0) expect(seccion).toContain('No hay promociones activas');
  });
});
