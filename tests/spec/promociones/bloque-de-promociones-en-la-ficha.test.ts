import type { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { crearContenedor } from '../_contenedor';
import { beforeAll, describe, expect, it } from 'vitest';
import PromocionesResumen from '../../../src/components/PromocionesResumen.astro';
import type { Campana, Cupon, EstadoPromocion } from '../../../src/lib/promociones';

const cupon: Cupon & { estado: EstadoPromocion } = {
  id: 'cupon-de-prueba',
  nombre: 'Cupón de prueba',
  porcentaje: 17,
  condicion: 'Condición del cupón de prueba',
  desde: '2031-03-10',
  hasta: '2031-03-20',
  estado: 'vigente',
};

const campana: Campana & { estado: EstadoPromocion } = {
  id: 'campana-de-prueba',
  nombre: 'Campaña de prueba',
  descripcion: 'Descripción de la campaña de prueba',
  desde: '2031-04-01',
  hasta: '2031-04-30',
  estado: 'proxima',
};

let contenedor: AstroContainer;

beforeAll(async () => {
  contenedor = await crearContenedor();
});

const render = (cupones: (typeof cupon)[], campanas: (typeof campana)[]) =>
  contenedor.renderToString(PromocionesResumen, {
    props: { aclaracion: 'Aclaración de prueba', cupones, campanas },
  });

const texto = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('[promociones] Bloque de promociones en la ficha', () => {
  it('Sin publicables', async () => {
    const html = await render([], []);
    expect(html).not.toContain('promociones-resumen');
  });

  it('Sin precios', async () => {
    const html = await render([cupon], [campana]);
    expect(html).toContain('id="promociones-resumen"');
    expect(texto(html)).not.toMatch(/\$\d{1,3}(\.\d{3})*/);
  });

  it('muestra la aclaración, cada promoción con su estado y el enlace a /promociones/', async () => {
    const html = await render([cupon], [campana]);
    const contenido = texto(html);
    expect(contenido).toContain('Aclaración de prueba');
    expect(contenido).toContain('Cupón de prueba — 17%');
    expect(contenido).toContain('Campaña de prueba');
    expect(contenido).toContain('01-04-2031 – 30-04-2031');
    expect(contenido).toContain('Vigente');
    expect(contenido).toContain('Próximamente');
    expect(html).toContain('href="/promociones/"');
  });
});
