import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FichaProducto, { type GrupoFicha } from '../../../src/components/FichaProducto';
import { construirGruposFicha, indiceAlCambiarDeGrupo, type ProductoFicha } from '../../../src/lib/ficha';

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

  it('Hasta 10 grupos el selector de grupo es un control segmentado distinto de los chips de opción', () => {
    const html = renderizar([grupo('Uno', 3), grupo('Dos', 3)]);
    expect(html).not.toContain('<select');
    const botonesDeGrupo = html.match(/<button[^>]*aria-pressed="(true|false)"[^>]*>(Uno|Dos)<\/button>/g) ?? [];
    expect(botonesDeGrupo).toHaveLength(2);
    expect(botonesDeGrupo.every((boton) => boton.includes('rounded-xl') && !boton.includes('rounded-full'))).toBe(true);
    const chips = html.match(/<button[^>]*aria-pressed="(true|false)"[^>]*>Uno opción \d<\/button>/g) ?? [];
    expect(chips).toHaveLength(3);
    expect(chips.every((chip) => chip.includes('rounded-full'))).toBe(true);
  });

  it('Con más de 10 grupos el selector de grupo es un select', () => {
    const grupos = Array.from({ length: 11 }, (_, indice) => grupo(`Diseno${indice + 1}`, 2));
    const html = renderizar(grupos);
    expect(html).toMatch(/<select[^>]*>(<option[^>]*>Diseno\d+<\/option>){11}<\/select>/);
    expect(html).not.toMatch(/<button[^>]*aria-pressed[^>]*>Diseno\d+<\/button>/);
  });

  describe('opciones en un orden único', () => {
    const enlace = (nombre: string) => `https://articulo.mercadolibre.cl/MLC-${nombre}-_JM`;
    const colores = (nombres: string[], prefijo: string) =>
      nombres.map((color) => ({ color, link: enlace(`${prefijo}-${color}`), imagenes: [`${prefijo}-${color}.jpg`] }));
    const ficha: ProductoFicha = {
      titulo: 'Kit',
      permalink: enlace('kit'),
      precioReferencial: 5000,
      imagenes: ['kit.jpg'],
      grupos: [
        { diseno: 'Negro', colores: colores(['Rojo', 'Rosa', 'Morado'], 'negro') },
        { diseno: 'Blanco', colores: colores(['Morado', 'Rojo', 'Rosa'], 'blanco') },
        { diseno: 'Violeta', colores: colores(['Rojo', 'Verde'], 'violeta') },
      ],
    };
    const { gruposFicha } = construirGruposFicha(ficha);

    it('Orden único de opciones', () => {
      const ordenEnElSelector = (indice: number) => {
        const unico = { nombre: gruposFicha[indice].nombre, opciones: gruposFicha[indice].opciones.map((opcion) => ({ nombre: opcion.nombre, link: opcion.link, precioTexto: '$1', fotos: [foto(opcion.nombre)] })) };
        const html = renderizar([unico]);
        return [...html.matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>([^<]+)<\/button>/g)].map((coincidencia) => coincidencia[1]);
      };
      expect(ordenEnElSelector(0)).toEqual(['Rojo', 'Rosa', 'Morado']);
      expect(ordenEnElSelector(1)).toEqual(['Rojo', 'Rosa', 'Morado']);
      expect(ordenEnElSelector(2)).toEqual(['Rojo', 'Verde']);
    });

    it('Cambio de grupo', () => {
      const activa = gruposFicha[0].opciones[2];
      const nuevo = gruposFicha[1].opciones[indiceAlCambiarDeGrupo(gruposFicha[1].opciones, activa.nombre)];
      expect(nuevo.nombre).toBe('Morado');
      expect(nuevo.link).toBe(enlace('blanco-Morado'));
    });

    it('Cambio de grupo sin la opción activa', () => {
      const activa = gruposFicha[0].opciones[1];
      const nuevo = gruposFicha[2].opciones[indiceAlCambiarDeGrupo(gruposFicha[2].opciones, activa.nombre)];
      expect(nuevo.nombre).toBe('Rojo');
      expect(nuevo.link).toBe(enlace('violeta-Rojo'));
    });
  });
});
