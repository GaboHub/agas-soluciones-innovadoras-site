import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const productosDir = path.resolve(dirname, '../../content/productos');
const siteJsonPath = path.resolve(dirname, '../../src/data/site.json');

const site = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));

const archivos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));

const productos = archivos.map((archivo) => {
  const contenido = readFileSync(path.join(productosDir, archivo), 'utf-8');
  const { data } = matter(contenido);
  return { archivo, data };
});

const slugsDeCategorias: string[] = site.categorias.map((categoria: { slug: string }) => categoria.slug);

describe('frontmatter de productos', () => {
  it.each(productos)('$archivo tiene los campos requeridos', ({ data }) => {
    expect(typeof data.titulo).toBe('string');
    expect(data.titulo.length).toBeGreaterThan(0);
    expect(typeof data.slug).toBe('string');
    expect(data.slug.length).toBeGreaterThan(0);
    expect(slugsDeCategorias).toContain(data.categoria);
    expect(['simple', 'variantes', 'familia']).toContain(data.tipo);
    expect(data.permalink).toMatch(/^https:\/\/(articulo\.)?mercadolibre\.cl\//);
    expect(Number.isInteger(data.precioReferencial)).toBe(true);
    expect(data.precioReferencial).toBeGreaterThan(0);
    expect(data.fechaPrecio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof data.resumen).toBe('string');
    expect(data.resumen.length).toBeGreaterThan(0);
    expect(Array.isArray(data.imagenes)).toBe(true);
    expect(data.imagenes.length).toBeGreaterThan(0);
  });

  it.each(productos)('$archivo con reviews tiene promedio 1..5 y comentarios bien formados', ({ data }) => {
    if (!data.reviews) return;
    expect(data.reviews.promedio).toBeGreaterThanOrEqual(1);
    expect(data.reviews.promedio).toBeLessThanOrEqual(5);
    expect(data.reviews.cantidad).toBeGreaterThan(0);
    for (const comentario of data.reviews.comentarios ?? []) {
      expect(comentario.estrellas).toBeGreaterThanOrEqual(1);
      expect(comentario.estrellas).toBeLessThanOrEqual(5);
      expect(typeof comentario.texto).toBe('string');
    }
  });
});

describe('consistencia site.json vs colección de productos', () => {
  const slugsDeclarados: string[] = site.categorias.flatMap(
    (categoria: { productos: string[] }) => categoria.productos,
  );
  const slugsDeContenido = productos.map(({ data }) => data.slug as string);

  it('hay exactamente 3 categorías sin claves de servicios', () => {
    expect(site.categorias.length).toBe(3);
    for (const categoria of site.categorias) {
      expect(categoria.servicios).toBeUndefined();
      expect(Array.isArray(categoria.productos)).toBe(true);
      expect(categoria.productos.length).toBeGreaterThan(0);
    }
  });

  it('hay exactamente 25 productos, sin duplicados', () => {
    expect(slugsDeContenido.length).toBe(25);
    expect(new Set(slugsDeContenido).size).toBe(25);
    expect(slugsDeclarados.length).toBe(25);
    expect(new Set(slugsDeclarados).size).toBe(25);
  });

  it('la categoría playstation-5 tiene exactamente 8 productos', () => {
    const playstation = site.categorias.find((categoria: { slug: string }) => categoria.slug === 'playstation-5');
    expect(playstation.productos.length).toBe(8);
    expect(playstation.productos).toContain('kit-funda-silicona-pixel-grips-control-ps5');
  });

  it('la categoría audio tiene exactamente 3 productos y no incluye el duplicado colapsado', () => {
    const audio = site.categorias.find((categoria: { slug: string }) => categoria.slug === 'audio');
    expect(audio.productos).toEqual([
      'audifonos-usb-c-manos-libres',
      'audifonos-bluetooth-tws',
      'audifonos-bluetooth-open-ear',
    ]);
    expect(slugsDeContenido).not.toContain('audifonos-usb-c-blanco');
  });
});

describe('qué incluye extraído de las descripciones', () => {
  const slugsConIncluye = [
    'pack-4-grips-joystick',
    'kit-funda-silicona-grips-control-ps5',
    'set-9en1-nintendo-switch-2',
    'kit-5en1-nintendo-switch-2',
  ];

  it.each(slugsConIncluye)('%s tiene incluye no vacío', (slug) => {
    const producto = productos.find(({ data }) => data.slug === slug);
    expect(producto).toBeDefined();
    expect(Array.isArray(producto?.data.incluye)).toBe(true);
    expect(producto?.data.incluye.length).toBeGreaterThan(0);
  });

  it('ningún incluye trae artefactos de underscores', () => {
    for (const { data } of productos) {
      for (const item of data.incluye ?? []) {
        expect(item).not.toMatch(/__/);
      }
    }
  });
});

describe('deep-links de variantes', () => {
  const conVariantes = productos.filter(({ data }) => data.tipo === 'variantes');

  it('hay al menos un producto con variantes', () => {
    expect(conVariantes.length).toBeGreaterThan(0);
  });

  it.each(conVariantes)('$archivo tiene link con ?variation= por variante', ({ data }) => {
    for (const variante of data.variantes) {
      expect(variante.link.startsWith(data.permalink)).toBe(true);
      expect(variante.link).toMatch(/\?variation=\d+$/);
    }
  });
});

describe('barrido agas-context.nuevo: filtro de estado y familias remapeadas', () => {
  it('audifonos-usb-c-manos-libres apunta a la publicación activa MLC-2035097907, no a la cerrada', () => {
    const producto = productos.find(({ data }) => data.slug === 'audifonos-usb-c-manos-libres');
    expect(producto).toBeDefined();
    expect(producto?.data.permalink).toContain('MLC-2035097907');
    expect(producto?.data.reviews).toBeUndefined();
  });

  it('kit-funda-acrilica-grips-control-ps5 es familia con 2 miembros Transparente/Negro y reviews agregadas', () => {
    const producto = productos.find(({ data }) => data.slug === 'kit-funda-acrilica-grips-control-ps5');
    expect(producto).toBeDefined();
    expect(producto?.data.tipo).toBe('familia');
    expect(producto?.data.miembros).toHaveLength(2);
    expect(producto?.data.miembros.map((miembro: { atributos: { color: string } }) => miembro.atributos.color)).toEqual([
      'Transparente',
      'Negro',
    ]);
    expect(producto?.data.reviews).toBeDefined();
    expect(producto?.data.reviews.cantidad).toBe(2);
    expect(producto?.data.reviews.promedio).toBe(5);
    const comentarios = producto?.data.reviews.comentarios as Array<{ fecha: string; texto: string }>;
    expect(new Set(comentarios.map((c) => c.fecha + c.texto)).size).toBe(comentarios.length);
  });

  it('kit-estuche-funda-acrilica-control-ps5 es familia con 2 miembros Transparente/Negro semitransparente y 1 review agregada', () => {
    const producto = productos.find(({ data }) => data.slug === 'kit-estuche-funda-acrilica-control-ps5');
    expect(producto).toBeDefined();
    expect(producto?.data.tipo).toBe('familia');
    expect(producto?.data.miembros).toHaveLength(2);
    expect(producto?.data.miembros.map((miembro: { atributos: { color: string } }) => miembro.atributos.color)).toEqual([
      'Transparente',
      'Negro semitransparente',
    ]);
    expect(producto?.data.reviews.cantidad).toBe(1);
    expect(producto?.data.reviews.promedio).toBe(4);
  });

  it('audifonos-bluetooth-open-ear es familia con 3 miembros Negro/Violeta/Amarillo', () => {
    const producto = productos.find(({ data }) => data.slug === 'audifonos-bluetooth-open-ear');
    expect(producto).toBeDefined();
    expect(producto?.data.tipo).toBe('familia');
    expect(producto?.data.miembros).toHaveLength(3);
    expect(producto?.data.miembros.map((miembro: { atributos: { color: string } }) => miembro.atributos.color)).toEqual([
      'Negro',
      'Violeta',
      'Amarillo',
    ]);
  });
});

describe('familia kit-funda-silicona-pixel-grips-control-ps5', () => {
  const producto = productos.find(({ data }) => data.slug === 'kit-funda-silicona-pixel-grips-control-ps5');
  type Grupo = { diseno: string; colores: { color: string; link: string }[] };

  it('existe en playstation-5 con etiquetas Funda y Grips', () => {
    expect(producto).toBeDefined();
    expect(producto?.data.categoria).toBe('playstation-5');
    expect(producto?.data.tipo).toBe('familia');
    expect(producto?.data.etiquetaGrupo).toBe('Funda');
    expect(producto?.data.etiquetaOpcion).toBe('Grips');
    expect(producto?.data.miembros).toBeUndefined();
  });

  it('agrupa por color de funda, cada grupo con 9 colores de grips', () => {
    const grupos = producto?.data.grupos as Grupo[];
    expect(grupos.map((grupo) => grupo.diseno).sort()).toEqual(['Blanco', 'Negro', 'Rosa Chicle', 'Violeta']);
    for (const grupo of grupos) {
      expect(grupo.colores).toHaveLength(9);
      expect(grupo.colores.map((color) => color.color).sort()).toEqual([
        'Amarillo',
        'Azul',
        'Blanco',
        'Gris',
        'Morado',
        'Negro',
        'Rojo',
        'Rosa',
        'Verde',
      ]);
    }
  });

  it('Blanco Grip Gris (singular) cae en el grupo Blanco con su publicación', () => {
    const grupos = producto?.data.grupos as Grupo[];
    const gris = grupos.find((grupo) => grupo.diseno === 'Blanco')?.colores.find((color) => color.color === 'Gris');
    expect(gris?.link).toContain('MLC-4522135884');
  });

  it('el resto de productos agrupados no lleva etiquetas propias', () => {
    const fundas = productos.find(({ data }) => data.slug === 'fundas-silicona-grips-control-ps5');
    expect(fundas?.data.grupos).toBeDefined();
    expect(fundas?.data.etiquetaGrupo).toBeUndefined();
    expect(fundas?.data.etiquetaOpcion).toBeUndefined();
  });
});
