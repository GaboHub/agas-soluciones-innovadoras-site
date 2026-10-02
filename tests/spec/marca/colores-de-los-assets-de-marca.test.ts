import { describe, expect, it } from 'vitest';
import { ASSETS_SVG, hexDe, leer, normalizarHex, SCRIPTS_DE_MARCA, tokens } from './_marca';

const BLANCO = '#ffffff';
const COBRE_CLARO = '#c8813f';
const NEGRO = '#000000';

const fueraDelConjunto = (texto: string, permitidos: string[]): string[] =>
  [...new Set(hexDe(texto).filter((hex) => !permitidos.includes(hex)))];

const rellenoDeLaBajada = (svg: string): string | undefined => {
  const relleno = svg.match(/<text\b([^>]*)>\s*SOLUCIONES INNOVADORAS/)?.[1].match(/\bfill="(#[0-9a-fA-F]{3,8})"/)?.[1];
  return relleno && normalizarHex(relleno);
};

describe('[marca] Colores de los assets de marca', () => {
  it('Hex permitidos', () => {
    const valores = tokens();
    expect(Object.keys(valores).length).toBeGreaterThanOrEqual(10);
    expect(Object.values(valores)).not.toContain(COBRE_CLARO);
    const permitidos = [...Object.values(valores), BLANCO, COBRE_CLARO];

    for (const ruta of ASSETS_SVG) {
      expect(hexDe(leer(ruta)).length, ruta).toBeGreaterThan(0);
      expect(fueraDelConjunto(leer(ruta), permitidos), ruta).toEqual([]);
    }
    for (const ruta of SCRIPTS_DE_MARCA) {
      expect(hexDe(leer(ruta)).length, ruta).toBeGreaterThan(0);
      expect(fueraDelConjunto(leer(ruta), [...permitidos, NEGRO]), ruta).toEqual([]);
    }
  });

  it('el barrido encuentra un hex ajeno y el negro fuera de los scripts', () => {
    const permitidos = ['#24455c', BLANCO];
    expect(fueraDelConjunto('fill="#24455C" stroke="#FFFFFF" fill="#123456" fill="#000000" fill="#123456"', permitidos)).toEqual([
      '#123456',
      '#000000',
    ]);
    expect(fueraDelConjunto('fill="#000000"', [...permitidos, NEGRO])).toEqual([]);
  });

  it('el barrido normaliza los hex de 3 dígitos y rechaza los de 4 y 8 dígitos', () => {
    const permitidos = [BLANCO, '#112233'];
    expect(hexDe('fill="#FFF" fill="#123" stroke="#1234" fill="#12345678" fill="#112233"')).toEqual([
      '#ffffff',
      '#112233',
      '#1234',
      '#12345678',
      '#112233',
    ]);
    expect(fueraDelConjunto('fill="#FFF" fill="#123" stroke="#1234" fill="#12345678" fill="#112233"', permitidos)).toEqual([
      '#1234',
      '#12345678',
    ]);
    expect(fueraDelConjunto('fill="#fff"', permitidos)).toEqual([]);
  });

  it('Bajada del lockup', () => {
    const valores = tokens();
    expect(rellenoDeLaBajada(leer('src/assets/images/agas-lockup.svg'))).toBe(valores.primario);
    expect(rellenoDeLaBajada(leer('src/assets/images/agas-lockup-blanco.svg'))).toBe(valores['primario-claro']);
  });

  it('la lectura de la bajada devuelve el relleno de ese texto y no el de otro', () => {
    const svg = '<text x="1" fill="#111111">OTRO</text><text x="2" font-size="15" fill="#AABBCC">SOLUCIONES INNOVADORAS</text>';
    expect(rellenoDeLaBajada(svg)).toBe('#aabbcc');
    expect(rellenoDeLaBajada('<text fill="#111111">OTRO</text>')).toBeUndefined();
    expect(rellenoDeLaBajada('<text fill="#ABC">SOLUCIONES INNOVADORAS</text>')).toBe('#aabbcc');
  });
});
