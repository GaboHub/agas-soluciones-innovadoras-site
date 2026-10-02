import site from '../../../src/data/site.json' with { type: 'json' };
import { abrir, eventosTras, expect, test } from './_ga4';

test.describe('[analitica] Un evento por click y listas disjuntas', () => {
  test('Un click emite a lo más un evento', async ({ page }) => {
    await abrir(page, '/');
    const destinos = [
      { href: 'https://articulo.mercadolibre.cl/MLC-1', nombre: 'clic_saliente' },
      { href: `https://${site.analitica.dominiosRedes[0]}/agas/`, nombre: 'clic_red_social' },
      { href: 'mailto:a@b.cl', nombre: 'clic_contacto' },
    ];
    for (const { href, nombre } of destinos) {
      const emitidos = await eventosTras(page, async () => {
        await page.evaluate((destino) => {
          const enlace = document.createElement('a');
          enlace.id = 'enlace-de-prueba';
          enlace.setAttribute('href', destino);
          enlace.addEventListener('click', (evento) => evento.preventDefault());
          const interior = document.createElement('span');
          interior.id = 'interior-de-prueba';
          interior.textContent = 'interior';
          enlace.append(interior);
          document.body.append(enlace);
        }, href);
        await page.locator('#interior-de-prueba').click();
        await page.evaluate(() => document.getElementById('enlace-de-prueba')?.remove());
      });
      expect(emitidos.map((evento) => evento.nombre), href).toEqual([nombre]);
    }
  });
});
