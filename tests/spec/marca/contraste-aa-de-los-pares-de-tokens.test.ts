import { describe, expect, it } from 'vitest';
import { tokens } from './_marca';

const BLANCO = '#ffffff';
const MINIMO = 4.5;

const TABLA: { textos: string[]; superficies: string[] }[] = [
  {
    textos: ['tinta', 'primario', 'primario-oscuro', 'acento-oscuro', 'destacado-oscuro', 'meli-tinta'],
    superficies: ['fondo', 'white', 'primario-claro'],
  },
  { textos: ['acento'], superficies: ['fondo', 'white'] },
  { textos: ['white', 'fondo', 'primario-claro', 'destacado'], superficies: ['primario', 'primario-oscuro'] },
];

const luminancia = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((inicio) => {
    const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contraste = (a: string, b: string): number => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};

const paresBajoElMinimo = (valores: Record<string, string>): string[] => {
  const valor = (nombre: string) => (nombre === 'white' ? BLANCO : valores[nombre]);
  return TABLA.flatMap(({ textos, superficies }) =>
    textos.flatMap((texto) =>
      superficies
        .map((superficie) => ({ par: `${texto} sobre ${superficie}`, razon: contraste(valor(texto), valor(superficie)) }))
        .filter(({ razon }) => !(razon >= MINIMO))
        .map(({ par, razon }) => `${par}: ${razon.toFixed(2)}`),
    ),
  );
};

describe('[marca] Contraste AA de los pares de tokens', () => {
  it('Tabla calculada', () => {
    const valores = tokens();
    const nombres = TABLA.flatMap(({ textos, superficies }) => [...textos, ...superficies]).filter((nombre) => nombre !== 'white');
    expect(Object.keys(valores)).toEqual(expect.arrayContaining(nombres));
    expect(paresBajoElMinimo(valores)).toEqual([]);
  });

  it('Token degradado', () => {
    const degradado = { ...tokens(), acento: '#c8813f' };
    expect(paresBajoElMinimo(degradado).map((hallazgo) => hallazgo.split(':')[0])).toEqual(['acento sobre fondo', 'acento sobre white']);
  });

  it('el cálculo reproduce razones conocidas de WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});
