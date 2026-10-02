import { describe, expect, it } from 'vitest';
import { coincidenciasEn, fuentesDeSrc } from '../interfaz/_fuentes';

const pesoProhibido = /(?<![\w-])font-(?:extrabold|black)(?![\w-])/g;

describe('[marca] Tipografía', () => {
  it('Escaneo de pesos', () => {
    const fuentes = fuentesDeSrc();
    const rutas = fuentes.map(({ ruta }) => ruta);
    expect(rutas).toEqual(
      expect.arrayContaining(['src/components/Header.astro', 'src/components/BuscadorProductos.tsx', 'src/styles/global.css']),
    );
    expect(coincidenciasEn(fuentes, pesoProhibido)).toEqual([]);
  });

  it('el detector encuentra los pesos prohibidos, también con variantes, y deja pasar los permitidos', () => {
    const texto = 'font-extrabold font-black md:font-extrabold hover:font-black font-bold font-semibold font-normal font-titulos';
    expect(coincidenciasEn([{ ruta: 'prueba.astro', texto }], pesoProhibido)).toEqual([
      'prueba.astro: font-extrabold',
      'prueba.astro: font-black',
      'prueba.astro: font-extrabold',
      'prueba.astro: font-black',
    ]);
  });
});
