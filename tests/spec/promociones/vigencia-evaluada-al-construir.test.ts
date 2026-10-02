import type { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { crearContenedor } from '../_contenedor';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PaginaPromociones from '../../../src/components/PaginaPromociones.astro';
import PromocionesResumen from '../../../src/components/PromocionesResumen.astro';
import { GET } from '../../../src/pages/llms.txt.ts';
import { hoyEnChile, publicables } from '../../../src/lib/promociones';
import { guiasDePrueba } from '../seo-geo/_llms';
import { site } from '../../../src/lib/site';
import { promocionesDePrueba } from './_datos';

vi.mock('astro:content', async () => {
  const { site } = await import('../../../src/lib/site');
  const fichas = site.categorias.flatMap((categoria) => categoria.productos).map((slug) => ({
    data: {
      slug,
      titulo: `Ficha ${slug}`,
      precioReferencial: 1000,
      fechaPrecio: '2031-03-09',
      permalink: `https://articulo.mercadolibre.cl/${slug}`,
    },
  }));
  const guias = (await import('../seo-geo/_llms')).guiasDePrueba.map((data) => ({ data }));
  return { getCollection: async (coleccion: string) => (coleccion === 'productos' ? fichas : guias) };
});

vi.mock('../../../src/lib/promociones', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../../src/lib/promociones')>()),
  promociones: (await import('./_datos')).promocionesDePrueba,
}));

const campana = promocionesDePrueba.campanas[0];

const diaSiguiente = (fecha: string) => {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + 1);
  return dia.toISOString().slice(0, 10);
};

let contenedor: AstroContainer;

beforeAll(async () => {
  contenedor = await crearContenedor();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const superficies = async () => {
  const hoy = hoyEnChile();
  const cupones = publicables(promocionesDePrueba.cupones, hoy);
  const campanas = publicables(promocionesDePrueba.campanas, hoy);
  const pagina = await contenedor.renderToString(PaginaPromociones, {
    props: { aclaracion: promocionesDePrueba.aclaracion, cupones, campanas, faqs: promocionesDePrueba.faqs },
  });
  const resumen = await contenedor.renderToString(PromocionesResumen, { props: { cupones, campanas } });
  const llms = await (await GET({} as Parameters<typeof GET>[0])).text();
  return { pagina, resumen, llms };
};

describe('[promociones] Vigencia evaluada al construir', () => {
  it('Build posterior al cierre', async () => {
    vi.stubEnv('AGAS_FECHA_BUILD', diaSiguiente(campana.hasta));
    const { pagina, resumen, llms } = await superficies();
    expect(pagina).not.toContain(campana.nombre);
    expect(resumen).not.toContain(campana.nombre);
    expect(llms).not.toContain(campana.nombre);
  });

  it('con AGAS_FECHA_BUILD dentro de la ventana la campaña sí se publica', async () => {
    vi.stubEnv('AGAS_FECHA_BUILD', campana.desde);
    const { pagina, resumen, llms } = await superficies();
    expect(pagina).toContain(campana.nombre);
    expect(resumen).toContain(campana.nombre);
    expect(llms).toContain(campana.nombre);
  });

  it('la ruta de llms.txt responde text/plain y usa los datos del sitio', async () => {
    vi.stubEnv('AGAS_FECHA_BUILD', campana.desde);
    const respuesta = await GET({} as Parameters<typeof GET>[0]);
    expect(respuesta.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const cuerpo = await respuesta.text();
    expect(cuerpo).toContain(`Ficha ${site.categorias[0].productos[0]}`);
    expect(cuerpo).toContain(guiasDePrueba[0].titulo);
  });
});
