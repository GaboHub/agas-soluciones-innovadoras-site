import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import { construirGruposFicha, linkInicial, type ProductoFicha } from '../../src/lib/ficha';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const productosDir = path.resolve(dirname, '../../content/productos');

describe('construirGruposFicha — producto simple', () => {
  const data: ProductoFicha = {
    titulo: 'Lámina Vidrio Switch',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-simple-_JM',
    precioReferencial: 4490,
    imagenes: ['a.jpg', 'b.jpg'],
  };
  const resultado = construirGruposFicha(data);

  it('devuelve un único grupo y una única opción con el permalink', () => {
    expect(resultado.gruposFicha).toHaveLength(1);
    expect(resultado.gruposFicha[0].nombre).toBe(data.titulo);
    expect(resultado.gruposFicha[0].opciones).toHaveLength(1);
    const opcion = resultado.gruposFicha[0].opciones[0];
    expect(opcion.nombre).toBe(data.titulo);
    expect(opcion.link).toBe(data.permalink);
    expect(opcion.precioTexto).toBe('$4.490');
    expect(opcion.rutasImagenes).toEqual(data.imagenes);
    expect(opcion.altFotos).toBe(data.titulo);
  });

  it('usa las etiquetas por defecto', () => {
    expect(resultado.etiquetaGrupo).toBe('Diseño');
    expect(resultado.etiquetaOpcion).toBe('Variante');
  });

  it('linkInicial devuelve el link de la primera opción', () => {
    expect(linkInicial(resultado.gruposFicha)).toBe(data.permalink);
  });
});

describe('construirGruposFicha — grupos (diseño + color)', () => {
  const data: ProductoFicha = {
    titulo: 'Fundas PS5',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM',
    precioReferencial: 9990,
    imagenes: ['fallback.jpg'],
    grupos: [
      {
        diseno: 'Camo',
        colores: [
          { color: 'Rojo', link: 'https://articulo.mercadolibre.cl/MLC-camo-rojo', imagenes: ['camo-rojo.jpg'] },
          { color: 'Azul', link: 'https://articulo.mercadolibre.cl/MLC-camo-azul', imagenes: ['camo-azul.jpg'] },
        ],
      },
      {
        diseno: 'Camo Blanco',
        colores: [
          { color: 'Negro', link: 'https://articulo.mercadolibre.cl/MLC-blanco-negro', imagenes: ['blanco-negro.jpg'] },
        ],
      },
    ],
  };
  const resultado = construirGruposFicha(data);

  it('genera un grupo por diseño y una opción por color', () => {
    expect(resultado.gruposFicha).toHaveLength(2);
    expect(resultado.gruposFicha[0].nombre).toBe('Camo');
    expect(resultado.gruposFicha[0].opciones).toHaveLength(2);
    expect(resultado.gruposFicha[1].nombre).toBe('Camo Blanco');
    expect(resultado.gruposFicha[1].opciones).toHaveLength(1);
  });

  it('cada opción trae nombre, link, precio y alt correctos', () => {
    const opcion = resultado.gruposFicha[0].opciones[0];
    expect(opcion.nombre).toBe('Rojo');
    expect(opcion.link).toBe('https://articulo.mercadolibre.cl/MLC-camo-rojo');
    expect(opcion.precioTexto).toBe('$9.990');
    expect(opcion.rutasImagenes).toEqual(['camo-rojo.jpg']);
    expect(opcion.altFotos).toBe('Fundas PS5 (Camo, Rojo)');
  });

  it('usa etiqueta de opción "Color"', () => {
    expect(resultado.etiquetaGrupo).toBe('Diseño');
    expect(resultado.etiquetaOpcion).toBe('Color');
  });

  it('linkInicial devuelve el link del primer grupo, primera opción', () => {
    expect(linkInicial(resultado.gruposFicha)).toBe('https://articulo.mercadolibre.cl/MLC-camo-rojo');
  });
});

describe('construirGruposFicha — grupos con etiquetas propias', () => {
  const base: ProductoFicha = {
    titulo: 'Kit Funda Pixel',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM',
    precioReferencial: 8590,
    imagenes: ['fallback.jpg'],
    grupos: [
      {
        diseno: 'Negro',
        colores: [{ color: 'Rojo', link: 'https://articulo.mercadolibre.cl/MLC-negro-rojo', imagenes: ['negro-rojo.jpg'] }],
      },
    ],
  };

  it('usa etiquetaGrupo y etiquetaOpcion del producto', () => {
    const resultado = construirGruposFicha({ ...base, etiquetaGrupo: 'Funda', etiquetaOpcion: 'Grips' });
    expect(resultado.etiquetaGrupo).toBe('Funda');
    expect(resultado.etiquetaOpcion).toBe('Grips');
  });

  it('sin etiquetas propias cae en Diseño y Color', () => {
    const resultado = construirGruposFicha(base);
    expect(resultado.etiquetaGrupo).toBe('Diseño');
    expect(resultado.etiquetaOpcion).toBe('Color');
  });

  it('la rama miembros ignora las etiquetas propias', () => {
    const miembros = construirGruposFicha({
      ...base,
      grupos: undefined,
      etiquetaGrupo: 'Funda',
      etiquetaOpcion: 'Grips',
      miembros: [
        { titulo: 'M', link: 'https://articulo.mercadolibre.cl/MLC-m', precio: 1000, imagenes: ['m.jpg'], atributos: {} },
      ],
    });
    expect(miembros.etiquetaGrupo).toBe('Diseño');
    expect(miembros.etiquetaOpcion).toBe('Opción');
  });

  it('la rama variantes ignora las etiquetas propias', () => {
    const variantes = construirGruposFicha({
      ...base,
      grupos: undefined,
      etiquetaGrupo: 'Funda',
      etiquetaOpcion: 'Grips',
      variantes: [
        { nombre: 'Chico', atributo: 'Talla', link: 'https://articulo.mercadolibre.cl/MLC-v?variation=1', imagenes: ['v.jpg'] },
      ],
    });
    expect(variantes.etiquetaGrupo).toBe('Diseño');
    expect(variantes.etiquetaOpcion).toBe('Talla');
  });
});

describe('construirGruposFicha — miembros (familia)', () => {
  const data: ProductoFicha = {
    titulo: 'Cargador Dual PS5',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM',
    precioReferencial: 15990,
    imagenes: ['fallback.jpg'],
    miembros: [
      {
        titulo: 'Cargador Dual PS5 Negro',
        link: 'https://articulo.mercadolibre.cl/MLC-negro',
        precio: 15990,
        imagenes: ['negro.jpg'],
        atributos: { color: 'Negro' },
      },
      {
        titulo: 'Cargador Dual PS5 Genérico',
        link: 'https://articulo.mercadolibre.cl/MLC-generico',
        precio: 12990,
        imagenes: ['generico.jpg'],
        atributos: {},
      },
    ],
  };
  const resultado = construirGruposFicha(data);

  it('genera un único grupo con una opción por miembro', () => {
    expect(resultado.gruposFicha).toHaveLength(1);
    expect(resultado.gruposFicha[0].nombre).toBe(data.titulo);
    expect(resultado.gruposFicha[0].opciones).toHaveLength(2);
  });

  it('usa el color del miembro como nombre si existe, o el título si no', () => {
    const [primero, segundo] = resultado.gruposFicha[0].opciones;
    expect(primero.nombre).toBe('Negro');
    expect(segundo.nombre).toBe('Cargador Dual PS5 Genérico');
  });

  it('el precio y alt vienen del miembro', () => {
    const [primero, segundo] = resultado.gruposFicha[0].opciones;
    expect(primero.link).toBe('https://articulo.mercadolibre.cl/MLC-negro');
    expect(primero.precioTexto).toBe('$15.990');
    expect(primero.altFotos).toBe('Cargador Dual PS5 Negro');
    expect(segundo.precioTexto).toBe('$12.990');
    expect(segundo.altFotos).toBe('Cargador Dual PS5 Genérico');
  });

  it('usa etiqueta de opción "Opción"', () => {
    expect(resultado.etiquetaOpcion).toBe('Opción');
  });

  it('linkInicial devuelve el link del primer miembro', () => {
    expect(linkInicial(resultado.gruposFicha)).toBe('https://articulo.mercadolibre.cl/MLC-negro');
  });
});

describe('construirGruposFicha — variantes', () => {
  const data: ProductoFicha = {
    titulo: 'Kit 5en1 Switch 2',
    permalink: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM',
    precioReferencial: 12990,
    imagenes: ['fallback.jpg'],
    variantes: [
      {
        nombre: 'Rosado',
        atributo: 'Color',
        link: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM?variation=1',
        imagenes: ['rosado.jpg'],
      },
      {
        nombre: 'Celeste',
        atributo: 'Color',
        link: 'https://articulo.mercadolibre.cl/MLC-1-base-_JM?variation=2',
        imagenes: ['celeste.jpg'],
      },
    ],
  };
  const resultado = construirGruposFicha(data);

  it('genera un único grupo con una opción por variante', () => {
    expect(resultado.gruposFicha).toHaveLength(1);
    expect(resultado.gruposFicha[0].nombre).toBe(data.titulo);
    expect(resultado.gruposFicha[0].opciones).toHaveLength(2);
  });

  it('cada opción trae nombre, link, precio base y alt correctos', () => {
    const opcion = resultado.gruposFicha[0].opciones[0];
    expect(opcion.nombre).toBe('Rosado');
    expect(opcion.link).toBe('https://articulo.mercadolibre.cl/MLC-1-base-_JM?variation=1');
    expect(opcion.precioTexto).toBe('$12.990');
    expect(opcion.rutasImagenes).toEqual(['rosado.jpg']);
    expect(opcion.altFotos).toBe('Kit 5en1 Switch 2 (Rosado)');
  });

  it('usa el atributo de la primera variante como etiqueta de opción', () => {
    expect(resultado.etiquetaOpcion).toBe('Color');
  });

  it('linkInicial devuelve el link de la primera variante', () => {
    expect(linkInicial(resultado.gruposFicha)).toBe('https://articulo.mercadolibre.cl/MLC-1-base-_JM?variation=1');
  });
});

describe('invariante sobre el catálogo real', () => {
  const archivos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));
  const productos = archivos.map((archivo) => {
    const contenido = readFileSync(path.join(productosDir, archivo), 'utf-8');
    const { data } = matter(contenido);
    return { archivo, data: data as ProductoFicha };
  });

  it.each(productos)('$archivo — todas las opciones apuntan a mercadolibre.cl y linkInicial no está vacío', ({ data }) => {
    const resultado = construirGruposFicha(data);
    for (const grupo of resultado.gruposFicha) {
      for (const opcion of grupo.opciones) {
        expect(opcion.link).toMatch(/mercadolibre\.cl/);
      }
    }
    const inicial = linkInicial(resultado.gruposFicha);
    expect(typeof inicial).toBe('string');
    expect(inicial.length).toBeGreaterThan(0);
  });
});
