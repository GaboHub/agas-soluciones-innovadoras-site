import { describe, expect, it } from 'vitest';
import { ASSETS_SVG, leer } from './_marca';

const radioDelIsotipo = /<rect\b[^>]*\brx="24"/;

describe('[marca] Firma baldosa AGAS', () => {
  it('Radio del isotipo', () => {
    expect(ASSETS_SVG).toEqual(['public/favicon.svg', 'src/assets/images/agas-lockup.svg', 'src/assets/images/agas-lockup-blanco.svg']);
    for (const ruta of ASSETS_SVG) {
      const svg = leer(ruta);
      expect(svg, ruta).toContain('<svg');
      expect(svg, ruta).toMatch(radioDelIsotipo);
    }
  });

  it('el detector rechaza otro radio y un rx fuera de un rect', () => {
    expect('<rect x="4" rx="20"/>').not.toMatch(radioDelIsotipo);
    expect('<rect x="4" rx="240"/>').not.toMatch(radioDelIsotipo);
    expect('<circle rx="24"/>').not.toMatch(radioDelIsotipo);
    expect('<rect x="4" width="88" rx="24" fill="#fff"/>').toMatch(radioDelIsotipo);
  });
});
