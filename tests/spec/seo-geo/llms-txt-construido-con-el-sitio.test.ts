import { describe, expect, it } from 'vitest';
import { construirLlmsTxt } from '../../../src/lib/llms';
import { entradaDePrueba, fichasDePrueba, sitioDePrueba } from './_llms';

const lineas = (texto: string) => texto.split('\n');

describe('[seo-geo] llms.txt construido con el sitio', () => {
  it('Una línea por ficha', () => {
    const texto = construirLlmsTxt(entradaDePrueba());
    const todas = lineas(texto);
    const catalogo = todas.slice(todas.indexOf('## Catálogo'), todas.indexOf('## Guías'));
    expect(catalogo.filter((linea) => linea.startsWith('- '))).toEqual([
      '- [Ficha B2](https://agassoluciones.cl/productos/ficha-b2/): precio referencial $990 al 08-03-2031; en Mercado Libre: https://articulo.mercadolibre.cl/MLC-3-ficha-b2',
      '- [Ficha B1](https://agassoluciones.cl/productos/ficha-b1/): precio referencial $4.490 al 09-03-2031; en Mercado Libre: https://articulo.mercadolibre.cl/MLC-2-ficha-b1',
      '- [Ficha A1](https://agassoluciones.cl/productos/ficha-a1/): precio referencial $1.234.567 al 09-03-2031; en Mercado Libre: https://articulo.mercadolibre.cl/MLC-1-ficha-a1',
    ]);
    expect(catalogo.filter((linea) => linea.startsWith('### '))).toEqual(['### Categoría Beta', '### Categoría Alfa']);
    expect(catalogo.indexOf('### Categoría Alfa')).toBeGreaterThan(catalogo.findIndex((l) => l.includes('ficha-b1')));
    expect(catalogo.findIndex((l) => l.includes('ficha-a1'))).toBeGreaterThan(catalogo.indexOf('### Categoría Alfa'));
  });

  it('Datos de cabecera', () => {
    const texto = construirLlmsTxt(entradaDePrueba());
    expect(lineas(texto).slice(0, 7)).toEqual([
      '# Tienda de Prueba',
      '',
      `> ${sitioDePrueba.descripcion}`,
      '',
      `Tienda en Mercado Libre: ${sitioDePrueba.mercadolibre.tienda}`,
      `Página oficial en Mercado Libre: ${sitioDePrueba.mercadolibre.paginaOficial}`,
      '',
    ]);
  });

  it('Sin guías', () => {
    const texto = construirLlmsTxt(entradaDePrueba({ guias: [] }));
    expect(texto).not.toContain('## Guías');
  });

  it('lista las guías ordenadas por título', () => {
    const texto = lineas(construirLlmsTxt(entradaDePrueba()));
    const guias = texto.slice(texto.indexOf('## Guías')).filter((linea) => linea.startsWith('- '));
    expect(guias.slice(0, 2)).toEqual([
      '- [Alfa guía](https://agassoluciones.cl/guias/guia-a/): Descripción de la guía A.',
      '- [Zeta guía](https://agassoluciones.cl/guias/guia-z/): Descripción de la guía Z.',
    ]);
  });

  it('cierra con Más información y emite los bloques en orden', () => {
    const texto = construirLlmsTxt(entradaDePrueba());
    const encabezados = lineas(texto).filter((linea) => linea.startsWith('## '));
    expect(encabezados).toEqual(['## Catálogo', '## Guías', '## Promociones', '## Más información']);
    expect(texto.endsWith('- [Contacto](https://agassoluciones.cl/contacto/)\n')).toBe(true);
    expect(texto).toContain('- [Preguntas frecuentes](https://agassoluciones.cl/preguntas-frecuentes/)');
  });

  it('no lista fichas fuera de las categorías declaradas', () => {
    const huerfana = { ...fichasDePrueba[0], slug: 'ficha-huerfana', titulo: 'Huérfana' };
    const texto = construirLlmsTxt(entradaDePrueba({ fichas: [...fichasDePrueba, huerfana] }));
    expect(texto).not.toContain('ficha-huerfana');
  });

  it('omite el slug declarado en una categoría que no tiene ficha', () => {
    const categorias = [{ nombre: 'Categoría Alfa', productos: ['ficha-fantasma', 'ficha-a1'] }];
    const texto = construirLlmsTxt(entradaDePrueba({ categorias }));
    expect(texto).not.toContain('ficha-fantasma');
    expect(lineas(texto).filter((linea) => linea.startsWith('- [Ficha'))).toHaveLength(1);
  });
});
