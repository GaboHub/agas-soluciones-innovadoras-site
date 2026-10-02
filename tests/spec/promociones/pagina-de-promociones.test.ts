import type { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { crearContenedor } from '../_contenedor';
import { beforeAll, describe, expect, it } from 'vitest';
import PaginaPromociones from '../../../src/components/PaginaPromociones.astro';
import { site } from '../../../src/lib/site';
import type { Campana, Cupon, EstadoPromocion } from '../../../src/lib/promociones';

const faqs = [
  { pregunta: 'Pregunta uno', respuesta: 'Respuesta uno' },
  { pregunta: 'Pregunta dos', respuesta: 'Respuesta dos' },
  { pregunta: 'Pregunta tres', respuesta: 'Respuesta tres' },
];

const cupon = (estado: EstadoPromocion): Cupon & { estado: EstadoPromocion } => ({
  id: 'cupon-de-prueba',
  nombre: 'Cupón de prueba',
  porcentaje: 17,
  condicion: 'Condición del cupón de prueba',
  desde: '2031-03-10',
  hasta: '2031-03-20',
  estado,
});

const campana = (estado: EstadoPromocion): Campana & { estado: EstadoPromocion } => ({
  id: 'campana-de-prueba',
  nombre: 'Campaña de prueba',
  descripcion: 'Descripción de la campaña de prueba',
  desde: '2031-04-01',
  hasta: '2031-04-30',
  estado,
});

let contenedor: AstroContainer;

beforeAll(async () => {
  contenedor = await crearContenedor();
});

const render = (props: { cupones: ReturnType<typeof cupon>[]; campanas: ReturnType<typeof campana>[] }) =>
  contenedor.renderToString(PaginaPromociones, {
    props: { aclaracion: 'Aclaración de prueba', faqs, ...props },
  });

const tarjeta = (html: string, nombre: string) => {
  const articulos = html.match(/<article[\s\S]*?<\/article>/g) ?? [];
  return articulos.find((articulo) => articulo.includes(nombre)) ?? '';
};

describe('[promociones] Página de promociones', () => {
  it('Cupón vigente', async () => {
    const html = await render({ cupones: [cupon('vigente')], campanas: [] });
    const tarjetaCupon = tarjeta(html, 'Cupón de prueba');
    expect(tarjetaCupon).toContain('data-promo');
    expect(tarjetaCupon).toContain('Vigente');
    expect(tarjetaCupon).toContain('17%');
    expect(tarjetaCupon).toContain('10-03-2031 – 20-03-2031');
    expect(tarjetaCupon).toContain(`href="${site.mercadolibre.paginaOficial}"`);
    expect(html).toContain('id="cupones"');
    expect(html).not.toContain('id="campanas"');
    expect(html).not.toContain('id="promo-fallback"');
  });

  it('Campaña próxima', async () => {
    const html = await render({ cupones: [], campanas: [campana('proxima')] });
    const tarjetaCampana = tarjeta(html, 'Campaña de prueba');
    expect(tarjetaCampana).toContain('data-promo');
    expect(tarjetaCampana).toContain('Próximamente');
    expect(tarjetaCampana).not.toContain('Vigente');
    expect(tarjetaCampana).toContain('Descripción de la campaña de prueba');
    expect(tarjetaCampana).toContain('01-04-2031 – 30-04-2031');
    expect(tarjetaCampana).toContain(`href="${site.mercadolibre.tienda}"`);
    expect(html).toContain('id="campanas"');
    expect(html).not.toContain('id="cupones"');
  });

  it('Nada publicable', async () => {
    const html = await render({ cupones: [], campanas: [] });
    expect(html).toContain('id="promo-fallback"');
    expect(html).toContain(`href="${site.mercadolibre.tienda}"`);
    expect(html).not.toContain('id="cupones"');
    expect(html).not.toContain('id="campanas"');
    expect(html).not.toContain('data-promo');
  });

  it('muestra la aclaración y cierra con las preguntas frecuentes', async () => {
    const html = await render({ cupones: [cupon('vigente')], campanas: [campana('vigente')] });
    expect(html).toContain('Aclaración de prueba');
    expect(html.lastIndexOf('Pregunta uno')).toBeGreaterThan(html.lastIndexOf('data-promo'));
    expect(html).toContain('Respuesta tres');
  });
});
