import { describe, expect, it } from 'vitest';
import { coincidenciasEn, fuentesDeSrc, type Fuente } from '../interfaz/_fuentes';
import { tokens } from './_marca';

const colorLiteral =
  /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])|(?<![\w-])(?:rgba?|hsla?)\(/gi;

const TOKENS_DE_ROL = [
  'primario',
  'primario-oscuro',
  'primario-claro',
  'acento',
  'acento-oscuro',
  'destacado',
  'destacado-oscuro',
  'tinta',
  'fondo',
  'meli-tinta',
];

const literalesFueraDeGlobal = (fuentes: Fuente[]): string[] =>
  coincidenciasEn(
    fuentes.filter(({ ruta }) => ruta !== 'src/styles/global.css'),
    colorLiteral,
  );

describe('[marca] Tokens de rol como única paleta de la UI', () => {
  it('Escaneo de fuentes', () => {
    const fuentes = fuentesDeSrc();
    const rutas = fuentes.map(({ ruta }) => ruta);
    expect(rutas).toEqual(
      expect.arrayContaining(['src/components/Header.astro', 'src/components/BuscadorProductos.tsx', 'src/styles/global.css']),
    );
    expect(Object.keys(tokens())).toEqual(expect.arrayContaining(TOKENS_DE_ROL));
    expect(literalesFueraDeGlobal(fuentes)).toEqual([]);
  });

  it('el detector encuentra hex, rgb, rgba, hsl y hsla, ignora global.css y deja pasar anclas y entidades', () => {
    const texto =
      'a{color:#fff;background:#14232e;border-color:#abcd}b{color:rgb(1,2,3);color:rgba(1,2,3,.5);color:hsl(1 2% 3%);color:hsla(1,2%,3%,.5);color:#12345678;color:RGB(1,2,3);color:Hsl(1 2% 3%);color:RGBA(1,2,3,.5);color:HSLA(1,2%,3%,.5)}' +
      '<a href="#contenido">x</a><p>&#39;</p><p class="bg-[#fff]">z</p><p class="text-primario bg-white/7">w</p>';
    const fuentes = [
      { ruta: 'prueba.astro', texto },
      { ruta: 'src/styles/global.css', texto: '--color-x: #123456;' },
    ];
    expect(literalesFueraDeGlobal(fuentes).map((hallazgo) => hallazgo.replace('prueba.astro: ', ''))).toEqual([
      '#fff',
      '#14232e',
      '#abcd',
      'rgb(',
      'rgba(',
      'hsl(',
      'hsla(',
      '#12345678',
      'RGB(',
      'Hsl(',
      'RGBA(',
      'HSLA(',
      '#fff',
    ]);
  });
});
