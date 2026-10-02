import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, existe, generar, leerFicha, permalinkDeFixture, slugsGenerados, type Corrida } from './_arnes';

let contexto: string;
let raiz: string;
let corrida: Corrida;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  corrida = await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

const corridaCon = async (slugMap: unknown[]) => {
  const raizPropia = crearRaizCurada();
  try {
    const resultado = await generar({ contexto, raiz: raizPropia, slugMap });
    const slugs = slugsGenerados(raizPropia);
    const fichas = Object.fromEntries(slugs.map((slug) => [slug, leerFicha(raizPropia, slug)]));
    return { ...resultado, slugs, ficha: (slug: string) => fichas[slug] };
  } finally {
    borrar(raizPropia);
  }
};

describe('[catalogo] Mapeo de carpetas a fichas', () => {
  it('Prefijo sin carpeta', () => {
    expect(corrida.avisos).toContain('⚠ No se encontró carpeta para el prefijo MLC9, se omite no-existe');
    expect(existe(raiz, 'content/productos/no-existe.md')).toBe(false);
  });

  it('Carpeta sin mapeo', () => {
    const ficha = leerFicha(raiz, 'funda-x');
    expect(ficha.data.titulo).toBe('Funda X');
    expect(corrida.avisos).toContain('⚠ Carpeta sin mapeo explícito: MLC1010-funda-x → slug auto-generado "funda-x"');
  });

  it('Colisión de slug automático', () => {
    expect(leerFicha(raiz, 'funda-x-2').data.titulo).toBe('Funda X');
    expect(corrida.avisos).toContain('⚠ Carpeta sin mapeo explícito: MLC1011-funda-x-otra → slug auto-generado "funda-x-2"');
  });

  it('Slug y título salen de la entrada de SLUG_MAP', () => {
    const ficha = leerFicha(raiz, 'lamina-fixture');
    expect(ficha.data.slug).toBe('lamina-fixture');
    expect(ficha.data.titulo).toBe('Lámina Titulada Fixture Switch');
    expect(ficha.data.permalink).toBe(permalinkDeFixture('MLC1001-lamina-simple'));
  });

  it('el prefijo calza con la primera carpeta activa', async () => {
    const { ficha, avisos } = await corridaCon([{ prefijo: 'MLC100', slug: 'primera', titulo: 'Primera Fixture Switch' }]);
    expect(ficha('primera').data.permalink).toBe(permalinkDeFixture('MLC1001-lamina-simple'));
    expect(avisos.some((aviso) => aviso.includes('No se encontró carpeta'))).toBe(false);
  });

  it('una carpeta cerrada no cuenta para el prefijo', async () => {
    const { slugs, avisos } = await corridaCon([{ prefijo: 'MLC1005', slug: 'cerrada-mapeada', titulo: 'Cerrada Mapeada' }]);
    expect(avisos).toContain('⚠ No se encontró carpeta para el prefijo MLC1005, se omite cerrada-mapeada');
    expect(slugs).not.toContain('cerrada-mapeada');
  });
});
