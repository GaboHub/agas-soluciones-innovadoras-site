import { test, expect } from '@playwright/test';

test.describe('archivos estáticos', () => {
  test('robots.txt responde 200 y referencia el sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const cuerpo = await response.text();
    expect(cuerpo).toContain('Sitemap: https://agassoluciones.cl/sitemap-index.xml');
  });

  test('llms.txt responde 200 y resume el catálogo', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status()).toBe(200);
    const cuerpo = await response.text();
    expect(cuerpo).toContain('AGAS Soluciones Innovadoras');
    expect(cuerpo).toContain('Mercado Libre');
    expect(cuerpo).toContain('Nintendo Switch');
    expect(cuerpo).toContain('https://agassoluciones.cl/productos/');
  });

  test('llms.txt incluye la sección de Guías', async ({ request }) => {
    const response = await request.get('/llms.txt');
    const cuerpo = await response.text();
    expect(cuerpo).toContain('## Guías');
    expect(cuerpo).toContain('https://agassoluciones.cl/guias/');
  });

  test('favicon.svg responde 200', async ({ request }) => {
    const response = await request.get('/favicon.svg');
    expect(response.status()).toBe(200);
  });

  test('sitemap-index.xml responde 200', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    const cuerpo = await response.text();
    expect(cuerpo).toContain('<sitemapindex');
  });
});
