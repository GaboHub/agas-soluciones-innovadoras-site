import type { construirLlmsTxt } from '../../../src/lib/llms';

type Entrada = Parameters<typeof construirLlmsTxt>[0];

export const sitioDePrueba: Entrada['site'] = {
  nombre: 'Tienda de Prueba',
  descripcion: 'Descripción de la tienda de prueba, distinta a cualquier otra.',
  dominio: 'agassoluciones.cl',
  mercadolibre: {
    tienda: 'https://perfil.mercadolibre.cl/TIENDA_DE_PRUEBA',
    paginaOficial: 'https://www.mercadolibre.cl/pagina/tienda_de_prueba',
  },
};

export const categoriasDePrueba: Entrada['categorias'] = [
  { nombre: 'Categoría Beta', productos: ['ficha-b2', 'ficha-b1'] },
  { nombre: 'Categoría Alfa', productos: ['ficha-a1'] },
];

export const fichasDePrueba: Entrada['fichas'] = [
  {
    slug: 'ficha-a1',
    titulo: 'Ficha A1',
    precioReferencial: 1234567,
    fechaPrecio: '2031-03-09',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-ficha-a1',
  },
  {
    slug: 'ficha-b1',
    titulo: 'Ficha B1',
    precioReferencial: 4490,
    fechaPrecio: '2031-03-09',
    permalink: 'https://articulo.mercadolibre.cl/MLC-2-ficha-b1',
  },
  {
    slug: 'ficha-b2',
    titulo: 'Ficha B2',
    precioReferencial: 990,
    fechaPrecio: '2031-03-08',
    permalink: 'https://articulo.mercadolibre.cl/MLC-3-ficha-b2',
  },
];

export const guiasDePrueba: Entrada['guias'] = [
  { slug: 'guia-z', titulo: 'Zeta guía', descripcion: 'Descripción de la guía Z.' },
  { slug: 'guia-a', titulo: 'Alfa guía', descripcion: 'Descripción de la guía A.' },
];

export const promocionesDePrueba: Entrada['promociones'] = {
  cupones: [
    {
      id: 'cupon-de-prueba',
      nombre: 'Cupón de prueba',
      porcentaje: 17,
      condicion: 'Condición',
      desde: '2031-03-10',
      hasta: '2031-03-20',
    },
  ],
  campanas: [
    {
      id: 'campana-de-prueba',
      nombre: 'Campaña de prueba',
      descripcion: 'Descripción',
      desde: '2031-04-01',
      hasta: '2031-04-30',
    },
  ],
};

export const entradaDePrueba = (cambios: Partial<Entrada> = {}): Entrada => ({
  site: sitioDePrueba,
  categorias: categoriasDePrueba,
  fichas: fichasDePrueba,
  guias: guiasDePrueba,
  promociones: promocionesDePrueba,
  hoy: '2031-03-15',
  ...cambios,
});
