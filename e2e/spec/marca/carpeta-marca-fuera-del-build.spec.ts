import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const dist = path.resolve(import.meta.dirname, '../../../dist');
const raster = 'marca/redes/avatar.png';

test.describe('[marca] Carpeta marca fuera del build', () => {
  test('Ruta de marca', async ({ request }) => {
    expect(existsSync(path.resolve(import.meta.dirname, '../../..', raster))).toBe(true);
    expect(readdirSync(dist)).toContain('index.html');
    expect((await request.get('/logo.png')).status()).toBe(200);

    expect((await request.get(`/${raster}`)).status()).toBe(404);
    expect(readdirSync(dist)).not.toContain('marca');
    expect(existsSync(path.join(dist, raster))).toBe(false);
  });
});
