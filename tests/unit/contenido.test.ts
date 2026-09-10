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
const promocionesJsonPath = path.resolve(dirname, '../../src/data/promociones.json');

const site = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));
const catalogo = JSON.parse(readFileSync(catalogoJsonPath, 'utf-8'));
const promociones = JSON.parse(readFileSync(promocionesJsonPath, 'utf-8'));

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

  it('hay exactamente 24 productos, sin duplicados', () => {
    expect(slugsDeContenido.length).toBe(24);
    expect(new Set(slugsDeContenido).size).toBe(24);
    expect(slugsDeclarados.length).toBe(24);
    expect(new Set(slugsDeclarados).size).toBe(24);
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

  it('la categoría declarada en cada producto coincide con la de site.json', () => {
    for (const categoria of site.categorias) {
      for (const slug of categoria.productos) {
        const producto = productos.find(({ data }) => data.slug === slug);
        expect(producto?.data.categoria).toBe(categoria.slug);
      }
    }
  });

  it('catalogo.json tiene los mismos 24 productos', () => {
    expect(catalogo.productos.length).toBe(24);
    const slugsCatalogo = catalogo.productos.map((producto: { slug: string }) => producto.slug);
    expect(new Set(slugsCatalogo)).toEqual(new Set(slugsDeContenido));
  });

  it('llms.txt lista los mismos 24 productos y no el duplicado colapsado', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    const lineasCatalogo = llms
      .split('\n')
      .filter((linea) => linea.startsWith('- ') && linea.includes(' — ML: '));
    expect(lineasCatalogo.length).toBe(24);
    expect(llms).not.toContain('audifonos-usb-c-blanco');
  });

  it('llms.txt incluye la sección de Guías', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    expect(llms).toContain('## Guías');
    expect(llms).toContain('https://agassoluciones.cl/guias/');
  });

  it('llms.txt incluye la sección de Promociones', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    expect(llms).toContain('## Promociones');
    expect(llms).toContain('https://agassoluciones.cl/promociones/');
  });

  describe('sincronía entre llms.txt y promociones.json', () => {
    const llms = readFileSync(llmsTxtPath, 'utf-8');
    const seccionPromociones = llms.split('## Promociones')[1] ?? '';

    const cuponesEnLlms = [...seccionPromociones.matchAll(/^- Cupón: (.+) — (\d+)% \(vigente del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})\)$/gm)].map(
      ([, nombre, porcentaje, desde, hasta]) => ({
        nombre,
        porcentaje: Number(porcentaje),
        desde,
        hasta,
      }),
    );

    const campanasEnLlms = [...seccionPromociones.matchAll(/^- Campaña: (.+) \(vigente del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})\)$/gm)].map(
      ([, nombre, desde, hasta]) => ({ nombre, desde, hasta }),
    );

    function hoyEnChile(): string {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
    }

    it('cada cupón listado en llms.txt existe en promociones.json con los mismos datos', () => {
      for (const cuponLlms of cuponesEnLlms) {
        const cuponJson = promociones.cupones.find((cupon: { nombre: string }) => cupon.nombre === cuponLlms.nombre);
        expect(cuponJson, `no existe en promociones.json un cupón llamado "${cuponLlms.nombre}"`).toBeDefined();
        expect(cuponJson.porcentaje).toBe(cuponLlms.porcentaje);
        expect(cuponJson.desde).toBe(cuponLlms.desde);
        expect(cuponJson.hasta).toBe(cuponLlms.hasta);
      }
    });

    it('cada campaña listada en llms.txt existe en promociones.json con los mismos datos', () => {
      for (const campanaLlms of campanasEnLlms) {
        const campanaJson = promociones.campanas.find(
          (campana: { nombre: string }) => campana.nombre === campanaLlms.nombre,
        );
        expect(campanaJson, `no existe en promociones.json una campaña llamada "${campanaLlms.nombre}"`).toBeDefined();
        expect(campanaJson.desde).toBe(campanaLlms.desde);
        expect(campanaJson.hasta).toBe(campanaLlms.hasta);
      }
    });

    it('cada cupón no expirado de promociones.json aparece listado en llms.txt', () => {
      const hoy = hoyEnChile();
      const nombresEnLlms = new Set(cuponesEnLlms.map((cupon) => cupon.nombre));
      for (const cupon of promociones.cupones as { nombre: string; hasta: string }[]) {
        if (cupon.hasta < hoy) continue;
        expect(nombresEnLlms.has(cupon.nombre), `falta regenerar llms.txt: no lista el cupón "${cupon.nombre}"`).toBe(
          true,
        );
      }
    });

    it('cada campaña no expirada de promociones.json aparece listada en llms.txt', () => {
      const hoy = hoyEnChile();
      const nombresEnLlms = new Set(campanasEnLlms.map((campana) => campana.nombre));
      for (const campana of promociones.campanas as { nombre: string; hasta: string }[]) {
        if (campana.hasta < hoy) continue;
        expect(
          nombresEnLlms.has(campana.nombre),
          `falta regenerar llms.txt: no lista la campaña "${campana.nombre}"`,
        ).toBe(true);
      }
    });
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

  it('kit-estuche-funda-acrilica-control-ps5 es familia con 2 miembros Transparente/Negro semitransparente, sin reviews en ninguno de los dos', () => {
    const producto = productos.find(({ data }) => data.slug === 'kit-estuche-funda-acrilica-control-ps5');
    expect(producto).toBeDefined();
    expect(producto?.data.tipo).toBe('familia');
    expect(producto?.data.miembros).toHaveLength(2);
    expect(producto?.data.miembros.map((miembro: { atributos: { color: string } }) => miembro.atributos.color)).toEqual([
      'Transparente',
      'Negro semitransparente',
    ]);
    expect(producto?.data.reviews).toBeUndefined();
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
