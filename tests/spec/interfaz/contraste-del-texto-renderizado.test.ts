import { describe, expect, it } from 'vitest';
import { coincidenciasEn, fuentesDeSrc, type Fuente } from './_fuentes';

const utilidadConOpacidad = /(?<![\w-])(?:text-(?:tinta|white)|placeholder:text-[\w-]+)\/(\d+)/g;

const bajoElMinimo = (fuentes: Fuente[]): string[] =>
  coincidenciasEn(fuentes, utilidadConOpacidad).filter((hallazgo) => Number(hallazgo.match(/\/(\d+)$/)![1]) < 70);

describe('[interfaz] Contraste del texto renderizado', () => {
  it('Escaneo de utilidades', () => {
    const fuentes = fuentesDeSrc();
    const rutas = fuentes.map(({ ruta }) => ruta);
    expect(rutas).toEqual(
      expect.arrayContaining(['src/components/Header.astro', 'src/components/BuscadorProductos.tsx', 'src/styles/global.css']),
    );
    expect(bajoElMinimo(fuentes)).toEqual([]);
  });

  it('el detector encuentra las utilidades bajo el mínimo y deja pasar las demás', () => {
    const texto = '<p class="text-tinta/60 text-white/69 placeholder:text-tinta/40 text-tinta/70 text-white/90 text-primario/10">';
    expect(bajoElMinimo([{ ruta: 'prueba.astro', texto }])).toEqual([
      'prueba.astro: text-tinta/60',
      'prueba.astro: text-white/69',
      'prueba.astro: placeholder:text-tinta/40',
    ]);
  });
});
