import { expect, test } from '@playwright/test';

test.describe('[seo-geo] Acceso de rastreadores', () => {
  test('robots.txt servido', async ({ request }) => {
    const respuesta = await request.get('/robots.txt');
    expect(respuesta.status()).toBe(200);
    const lineas = (await respuesta.text()).split('\n').map((linea) => linea.trim());
    expect(lineas).toContain('User-agent: *');
    expect(lineas).toContain('Allow: /');
    expect(lineas).toContain('Content-Signal: search=yes, ai-input=yes');
    expect(lineas).toContain('Sitemap: https://agassoluciones.cl/sitemap-index.xml');
    expect(lineas.filter((linea) => /^disallow\s*:/i.test(linea))).toEqual([]);
    expect(lineas.filter((linea) => /^user-agent\s*:/i.test(linea))).toEqual(['User-agent: *']);
  });
});
