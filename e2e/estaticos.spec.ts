import { test, expect } from '@playwright/test';

test.describe('archivos estáticos', () => {
  test('robots.txt responde 200 y referencia el sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const cuerpo = await response.text();
    expect(cuerpo).toContain('Sitemap: https://agassoluciones.cl/sitemap-index.xml');
  });

  test('favicon.svg responde 200', async ({ request }) => {
    const response = await request.get('/favicon.svg');
    expect(response.status()).toBe(200);
  });

  test('apple-touch-icon.png responde 200', async ({ request }) => {
    const response = await request.get('/apple-touch-icon.png');
    expect(response.status()).toBe(200);
  });

  test('sitemap-index.xml responde 200', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    const cuerpo = await response.text();
    expect(cuerpo).toContain('<sitemapindex');
  });
});
