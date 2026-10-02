import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const bloques = (cabeceras: string): Map<string, string[]> => {
  const mapa = new Map<string, string[]>();
  let ruta: string | null = null;
  for (const linea of cabeceras.split('\n')) {
    if (!linea.trim()) continue;
    if (!/^\s/.test(linea)) {
      ruta = linea.trim();
      mapa.set(ruta, []);
    } else if (ruta) {
      mapa.get(ruta)!.push(linea.trim());
    }
  }
  return mapa;
};

test.describe('[sitio] Caché de assets con hash', () => {
  test('Cabeceras del build', () => {
    const cabeceras = bloques(readFileSync(path.resolve(import.meta.dirname, '../../../dist/_headers'), 'utf-8'));
    expect(cabeceras.get('/_astro/*')).toEqual(['Cache-Control: public, max-age=31536000, immutable']);
  });
});
