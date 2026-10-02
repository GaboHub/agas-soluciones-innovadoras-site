import { describe, expect, it } from 'vitest';
import { leer, normalizarHex, SCRIPTS_DE_MARCA, tokens, tokensDeTema } from './_marca';

const ROLES: Record<string, string> = {
  primario: 'primario',
  primarioOscuro: 'primario-oscuro',
  acento: 'acento',
  bajadaClara: 'primario-claro',
  destacado: 'destacado',
};

const paletaDe = (script: string): Record<string, string> => {
  const bloque = script.match(/const PALETA = \{([^}]*)\}/)?.[1] ?? '';
  return Object.fromEntries(
    [...bloque.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{3,8})'/g)].map(([, nombre, hex]) => [nombre, normalizarHex(hex)]),
  );
};

const rolesDivergentes = (paleta: Record<string, string>, valores: Record<string, string>): string[] =>
  Object.entries(ROLES)
    .filter(([constante]) => constante in paleta)
    .filter(([constante, token]) => paleta[constante] !== valores[token])
    .map(([constante, token]) => `${constante} != ${token}`);

describe('[marca] Paleta de los scripts igual a la de la UI', () => {
  it('Token cambiado', () => {
    const valores = tokens();
    for (const ruta of SCRIPTS_DE_MARCA) {
      const paleta = paletaDe(leer(ruta));
      expect(Object.keys(paleta), ruta).toEqual(expect.arrayContaining(['primario', 'primarioOscuro', 'acento', 'bajadaClara']));
      expect(rolesDivergentes(paleta, valores), ruta).toEqual([]);
    }
    expect(Object.keys(paletaDe(leer('scripts/generar-marca-redes.mjs')))).toContain('destacado');
  });

  it('un token cambiado sin tocar la paleta del script se detecta', () => {
    const paleta = paletaDe("const PALETA = {\n  primario: '#24455C',\n  acento: '#9E5220',\n  cobreClaro: '#C8813F',\n};");
    expect(paleta).toEqual({ primario: '#24455c', acento: '#9e5220', cobreClaro: '#c8813f' });
    const valores = { primario: '#24455c', acento: '#9e5220' };
    expect(rolesDivergentes(paleta, { ...valores, primario: '#000001' })).toEqual(['primario != primario']);
    expect(rolesDivergentes(paleta, valores)).toEqual([]);
  });

  it('la paleta y los tokens de 3 dígitos se comparan expandidos', () => {
    const paleta = paletaDe("const PALETA = {\n  primario: '#FFF',\n  acento: '#1234',\n};");
    expect(paleta).toEqual({ primario: '#ffffff', acento: '#1234' });
    expect(tokensDeTema('@theme {\n  --color-primario: #FFF;\n}')).toEqual({ primario: '#ffffff' });
    expect(rolesDivergentes(paleta, { primario: '#ffffff', acento: '#112233' })).toEqual(['acento != acento']);
  });
});
