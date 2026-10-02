import { describe, expect, it } from 'vitest';
import { coincidenciasEn, fuentesDeSrc } from './_fuentes';

const alturaEnViewportEstatico = /(?<![\w-])(?:(?:min|max)-)?h-screen(?![\w-])|\d+(?:\.\d+)?vh(?![\w-])/g;

describe('[interfaz] Unidades de viewport dinámicas', () => {
  it('Escaneo de fuentes', () => {
    const fuentes = fuentesDeSrc();
    const rutas = fuentes.map(({ ruta }) => ruta);
    expect(rutas).toEqual(
      expect.arrayContaining(['src/layouts/BaseLayout.astro', 'src/components/GalleryLightbox.tsx', 'src/styles/global.css']),
    );
    expect(coincidenciasEn(fuentes, alturaEnViewportEstatico)).toEqual([]);
  });

  it('el detector encuentra alturas estáticas y deja pasar las dinámicas', () => {
    const texto = 'min-h-screen h-screen max-h-[90vh] max-h-[80dvh] min-h-dvh height: 100vh';
    expect(coincidenciasEn([{ ruta: 'prueba.astro', texto }], alturaEnViewportEstatico)).toEqual([
      'prueba.astro: min-h-screen',
      'prueba.astro: h-screen',
      'prueba.astro: 90vh',
      'prueba.astro: 100vh',
    ]);
  });
});
