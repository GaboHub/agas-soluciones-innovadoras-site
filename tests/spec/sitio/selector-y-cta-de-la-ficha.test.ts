import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FichaProducto, { type GrupoFicha } from '../../../src/components/FichaProducto';

const foto = (nombre: string) => ({
  thumbSrc: `/${nombre}-t.jpg`,
  thumbWidth: 10,
  thumbHeight: 10,
  fullSrc: `/${nombre}.jpg`,
  fullWidth: 20,
  fullHeight: 20,
  alt: `Foto 1 de ${nombre}`,
});

const grupo = (nombre: string, opciones: number): GrupoFicha => ({
  nombre,
  opciones: Array.from({ length: opciones }, (_, indice) => ({
    nombre: `${nombre} opción ${indice + 1}`,
    link: `https://articulo.mercadolibre.cl/MLC-${nombre}-${indice + 1}-_JM`,
    precioTexto: '$1.000',
    fotos: [foto(`${nombre}-${indice + 1}`)],
  })),
});

const renderizar = (grupos: GrupoFicha[]) =>
  renderToStaticMarkup(
    createElement(FichaProducto, {
      grupos,
      etiquetaGrupo: 'Diseño',
      etiquetaOpcion: 'Color',
      leyenda: 'Leyenda',
      resumen: 'Resumen',
      envio: 'Envío',
      textoCtaPrincipal: 'CTA principal de prueba',
      textoCtaSecundario: 'Tienda',
      linkCtaSecundario: 'https://www.mercadolibre.cl/tienda',
    }),
  );

describe('[sitio] Selector y CTA de la ficha', () => {
  it('Muchas opciones', () => {
    const html = renderizar([grupo('Kit', 12)]);
    expect(html).toContain('<select');
    expect((html.match(/<option/g) ?? []).length).toBe(12);
    expect(html).not.toMatch(/<button[^>]*aria-pressed[^>]*>Kit opción/);
    expect(html).not.toContain('>Kit opción 1</button>');
  });

  it('Hasta 10 opciones el selector son botones con aria-pressed', () => {
    const html = renderizar([grupo('Kit', 10)]);
    expect(html).not.toContain('<select');
    expect((html.match(/aria-pressed="(true|false)"/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(html).toContain('>Kit opción 10</button>');
  });

  it('El selector de opción solo existe con más de una opción', () => {
    const html = renderizar([grupo('Kit', 1)]);
    expect(html).not.toContain('<select');
    expect(html).not.toMatch(/<button[^>]*aria-pressed="(true|false)"[^>]*>Kit opción/);
  });

  it('El selector de grupo solo existe con más de un grupo', () => {
    expect(renderizar([grupo('Solo', 3)])).not.toContain('Diseño:');
    expect(renderizar([grupo('Uno', 3), grupo('Dos', 3)])).toContain('Diseño:');
  });

  it('El CTA apunta a la opción inicial con target _blank y rel noopener', () => {
    const html = renderizar([grupo('Uno', 3), grupo('Dos', 3)]);
    expect(html).toMatch(
      /<a href="https:\/\/articulo\.mercadolibre\.cl\/MLC-Uno-1-_JM" target="_blank" rel="noopener" data-cta="ver-en-mercado-libre"/,
    );
  });

  it('El CTA principal muestra el texto recibido', () => {
    const html = renderizar([grupo('Uno', 3)]);
    expect(html).toMatch(/data-cta="ver-en-mercado-libre"[^>]*>CTA principal de prueba<\/a>/);
  });
});
