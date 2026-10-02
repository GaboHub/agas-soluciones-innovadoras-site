import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const dist = path.resolve(import.meta.dirname, '../../../dist');

const paginas = readdirSync(dist, { recursive: true, encoding: 'utf-8' }).filter((ruta) => ruta.endsWith('.html'));

test.describe('[sitio] Venta solo en Mercado Libre', () => {
  test('Sin formularios', () => {
    expect(paginas).toContain('index.html');
    expect(paginas.length).toBeGreaterThan(1);
    const conFormulario = paginas.filter((ruta) => /<form[\s>]/i.test(readFileSync(path.join(dist, ruta), 'utf-8')));
    expect(conFormulario).toEqual([]);
  });
});
