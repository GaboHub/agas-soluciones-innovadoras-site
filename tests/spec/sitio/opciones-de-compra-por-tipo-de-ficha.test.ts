import { describe, expect, it } from 'vitest';
import { construirGruposFicha, linkInicial, type ProductoFicha } from '../../../src/lib/ficha';
import { muestras } from '../../../e2e/spec/_muestras';

const enlace = (nombre: string) => `https://articulo.mercadolibre.cl/MLC-${nombre}-_JM`;
const base = { titulo: 'Ficha de prueba', permalink: enlace('base'), precioReferencial: 9990, imagenes: ['base.jpg'] };

const agrupada = (extra: Partial<ProductoFicha> = {}): ProductoFicha => ({
  ...base,
  ...extra,
  grupos: ['Camo', 'Skulls'].map((diseno) => ({
    diseno,
    colores: Array.from({ length: 9 }, (_, indice) => ({
      color: `Color ${indice + 1}`,
      link: enlace(`${diseno}-${indice + 1}`),
      imagenes: [`${diseno}-${indice + 1}.jpg`],
    })),
  })),
});

describe('[sitio] Opciones de compra por tipo de ficha', () => {
  it('Familia agrupada', () => {
    const { gruposFicha, etiquetaGrupo, etiquetaOpcion } = construirGruposFicha(agrupada());
    expect(gruposFicha.map((grupo) => grupo.nombre)).toEqual(['Camo', 'Skulls']);
    expect(gruposFicha.map((grupo) => grupo.opciones.length)).toEqual([9, 9]);
    expect(etiquetaGrupo).toBe('Diseño');
    expect(etiquetaOpcion).toBe('Color');
    expect(gruposFicha[1].opciones[2]).toMatchObject({ nombre: 'Color 3', link: enlace('Skulls-3'), precioTexto: '$9.990' });
  });

  it('Familia agrupada con ejes propios', () => {
    const { etiquetaGrupo, etiquetaOpcion } = construirGruposFicha(agrupada({ etiquetaGrupo: 'Funda', etiquetaOpcion: 'Grips' }));
    expect([etiquetaGrupo, etiquetaOpcion]).toEqual(['Funda', 'Grips']);
  });

  it('Miembros: una opción por miembro, con precio propio y eje Opción', () => {
    const { gruposFicha, etiquetaOpcion } = construirGruposFicha({
      ...base,
      miembros: [
        { titulo: 'Miembro Azul', link: enlace('azul'), precio: 7990, imagenes: ['a.jpg'], atributos: { color: 'Azul' } },
        { titulo: 'Miembro Rosa', link: enlace('rosa'), precio: 8990, imagenes: ['r.jpg'], atributos: { color: 'Rosa' } },
      ],
    });
    expect(gruposFicha).toHaveLength(1);
    expect(etiquetaOpcion).toBe('Opción');
    expect(gruposFicha[0].opciones.map((opcion) => [opcion.nombre, opcion.link, opcion.precioTexto])).toEqual([
      ['Azul', enlace('azul'), '$7.990'],
      ['Rosa', enlace('rosa'), '$8.990'],
    ]);
  });

  it('Miembro sin color', () => {
    const { gruposFicha } = construirGruposFicha({
      ...base,
      miembros: [
        { titulo: 'Miembro Azul', link: enlace('azul'), precio: 7990, imagenes: ['a.jpg'], atributos: { color: 'Azul' } },
        { titulo: 'Miembro sin color', link: enlace('sc'), precio: 7990, imagenes: ['s.jpg'], atributos: {} },
      ],
    });
    expect(gruposFicha[0].opciones.map((opcion) => opcion.nombre)).toEqual(['Azul', 'Miembro sin color']);
  });

  it('Variantes: una opción por variante, precio base y eje del atributo de la primera', () => {
    const { gruposFicha, etiquetaOpcion } = construirGruposFicha({
      ...base,
      variantes: [
        { nombre: 'Negro', atributo: 'Color', link: enlace('negro'), imagenes: ['n.jpg'] },
        { nombre: 'Azul', atributo: 'Otro', link: enlace('azul'), imagenes: ['a.jpg'] },
      ],
    });
    expect(gruposFicha).toHaveLength(1);
    expect(etiquetaOpcion).toBe('Color');
    expect(gruposFicha[0].opciones.map((opcion) => [opcion.nombre, opcion.link, opcion.precioTexto])).toEqual([
      ['Negro', enlace('negro'), '$9.990'],
      ['Azul', enlace('azul'), '$9.990'],
    ]);
  });

  it('Sin grupos, miembros ni variantes hay una opción con el permalink', () => {
    const { gruposFicha } = construirGruposFicha(base);
    expect(gruposFicha).toHaveLength(1);
    expect(gruposFicha[0].opciones).toHaveLength(1);
    expect(gruposFicha[0].opciones[0]).toMatchObject({ link: base.permalink, precioTexto: '$9.990' });
  });

  it('La opción inicial es la primera del primer grupo', () => {
    expect(linkInicial(construirGruposFicha(agrupada()).gruposFicha)).toBe(enlace('Camo-1'));
  });

  it('Destinos de compra', () => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    for (const ficha of muestras.fichas) {
      const { gruposFicha } = construirGruposFicha(ficha as unknown as ProductoFicha);
      const opciones = gruposFicha.flatMap((grupo) => grupo.opciones);
      expect(opciones.length, ficha.slug).toBeGreaterThan(0);
      for (const opcion of opciones) {
        expect(new URL(opcion.link).hostname, ficha.slug).toMatch(/(^|\.)mercadolibre\.cl$/);
      }
      expect(linkInicial(gruposFicha), ficha.slug).toBeTruthy();
    }
  });
});
