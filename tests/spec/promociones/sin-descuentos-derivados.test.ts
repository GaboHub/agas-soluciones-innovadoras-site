import type { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { crearContenedor } from '../_contenedor';
import { beforeAll, describe, expect, it } from 'vitest';
import PaginaPromociones from '../../../src/components/PaginaPromociones.astro';
import PromocionesResumen from '../../../src/components/PromocionesResumen.astro';
import { construirLlmsTxt } from '../../../src/lib/llms';
import { publicables } from '../../../src/lib/promociones';
import { entradaDePrueba } from '../seo-geo/_llms';
import { promocionesDePrueba as promociones } from './_datos';

const fecha = '2031-03-12';
const cupones = publicables(promociones.cupones, fecha);
const campanas = publicables(promociones.campanas, fecha);
const porcentajesDeCupones = cupones.map((cupon) => `${cupon.porcentaje}%`);

let contenedor: AstroContainer;

beforeAll(async () => {
  contenedor = await crearContenedor();
});

const texto = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const porcentajes = (contenido: string) => contenido.match(/\d+(?:[.,]\d+)?\s?%/g) ?? [];
const precios = (contenido: string) => contenido.match(/\$\s?\d[\d.,]*/g) ?? [];

describe('[promociones] Sin descuentos derivados', () => {
  it('la fecha elegida publica cupones y una campaña vigente', () => {
    expect(cupones).toHaveLength(promociones.cupones.length);
    expect(cupones.length).toBeGreaterThan(0);
    expect(campanas.some((campana) => campana.estado === 'vigente')).toBe(true);
    expect(porcentajesDeCupones.length).toBeGreaterThan(0);
  });

  it('Ficha con campaña vigente', async () => {
    expect(campanas.some((campana) => campana.estado === 'vigente')).toBe(true);
    expect(cupones.length).toBeGreaterThan(0);
    const resumen = texto(await contenedor.renderToString(PromocionesResumen, { props: { cupones, campanas } }));
    expect(precios(resumen)).toEqual([]);
    expect(porcentajes(resumen).sort()).toEqual([...porcentajesDeCupones].sort());
  });

  it('la página de promociones solo muestra los porcentajes de los cupones y ningún precio', async () => {
    const pagina = texto(
      await contenedor.renderToString(PaginaPromociones, {
        props: { aclaracion: promociones.aclaracion, cupones, campanas, faqs: [] },
      }),
    );
    expect(precios(pagina)).toEqual([]);
    expect(porcentajes(pagina).filter((valor) => !porcentajesDeCupones.includes(valor))).toEqual([]);
  });

  it('llms.txt solo repite el porcentaje de los cupones y el precio referencial de cada ficha', () => {
    const entrada = entradaDePrueba({ promociones, hoy: fecha });
    const llms = construirLlmsTxt(entrada);
    const seccion = llms.slice(llms.indexOf('## Promociones'), llms.indexOf('## Más información'));
    expect(porcentajes(seccion).sort()).toEqual([...porcentajesDeCupones].sort());
    expect(precios(seccion)).toEqual([]);
    const preciosDelCatalogo = precios(llms.slice(0, llms.indexOf('## Guías')));
    expect(preciosDelCatalogo.sort()).toEqual(
      entrada.fichas.map((ficha) => `$${ficha.precioReferencial.toLocaleString('es-CL')}`).sort(),
    );
  });
});
