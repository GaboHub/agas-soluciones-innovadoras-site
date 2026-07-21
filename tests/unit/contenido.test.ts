import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const productosDir = path.resolve(dirname, '../../content/productos');
const siteJsonPath = path.resolve(dirname, '../../src/data/site.json');
const catalogoJsonPath = path.resolve(dirname, '../../src/data/catalogo.json');
const llmsTxtPath = path.resolve(dirname, '../../public/llms.txt');

const site = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));
const catalogo = JSON.parse(readFileSync(catalogoJsonPath, 'utf-8'));

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

  it('cada slug declarado en site.json existe como producto', () => {
    for (const slug of slugsDeclarados) {
      expect(slugsDeContenido).toContain(slug);
    }
  });

  it('cada producto en contenido está declarado en site.json', () => {
    for (const slug of slugsDeContenido) {
      expect(slugsDeclarados).toContain(slug);
    }
  });

  it('hay exactamente 22 productos, sin duplicados', () => {
    expect(slugsDeContenido.length).toBe(22);
    expect(new Set(slugsDeContenido).size).toBe(22);
    expect(slugsDeclarados.length).toBe(22);
    expect(new Set(slugsDeclarados).size).toBe(22);
  });

  it('la categoría audio tiene exactamente 1 producto y no incluye el duplicado colapsado', () => {
    const audio = site.categorias.find((categoria: { slug: string }) => categoria.slug === 'audio');
    expect(audio.productos).toEqual(['audifonos-usb-c-manos-libres']);
    expect(slugsDeContenido).not.toContain('audifonos-usb-c-blanco');
  });

  it('la categoría declarada en cada producto coincide con la de site.json', () => {
    for (const categoria of site.categorias) {
      for (const slug of categoria.productos) {
        const producto = productos.find(({ data }) => data.slug === slug);
        expect(producto?.data.categoria).toBe(categoria.slug);
      }
    }
  });

  it('catalogo.json tiene los mismos 22 productos', () => {
    expect(catalogo.productos.length).toBe(22);
    const slugsCatalogo = catalogo.productos.map((producto: { slug: string }) => producto.slug);
    expect(new Set(slugsCatalogo)).toEqual(new Set(slugsDeContenido));
  });

  it('llms.txt lista los mismos 22 productos y no el duplicado colapsado', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    const lineasCatalogo = llms
      .split('\n')
      .filter((linea) => linea.startsWith('- ') && linea.includes(' — ML: '));
    expect(lineasCatalogo.length).toBe(22);
    expect(llms).not.toContain('audifonos-usb-c-blanco');
  });

  it('llms.txt incluye la sección de Guías', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    expect(llms).toContain('## Guías');
    expect(llms).toContain('https://agassoluciones.cl/guias/');
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
