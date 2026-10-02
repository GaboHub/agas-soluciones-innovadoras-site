import site from '../../../src/data/site.json' with { type: 'json' };
import { abrir, clicEnEnlaceNuevo, eventosTras, expect, test } from './_ga4';

test.describe('[analitica] Clic a redes sociales', () => {
  test('Instagram', async ({ page }) => {
    await abrir(page, '/');
    const cuenta = `https://www.instagram.com/${new URL(site.redes.instagram).pathname.split('/').filter(Boolean)[0]}/`;
    const emitidos = await clicEnEnlaceNuevo(page, cuenta);
    expect(emitidos.map((evento) => evento.nombre)).toEqual(['clic_red_social']);
    expect(emitidos[0].parametros).toEqual({ destino: cuenta, pagina: '/' });
  });

  test('Enlace real del footer', async ({ page }) => {
    await abrir(page, '/');
    const enlace = page.locator(`footer a[href="${site.redes.instagram}"]`);
    await expect(enlace).toHaveCount(1);
    await enlace.evaluate((elemento) => elemento.addEventListener('click', (evento) => evento.preventDefault()));
    const emitidos = await eventosTras(page, () => enlace.click());
    expect(emitidos.map((evento) => evento.nombre)).toEqual(['clic_red_social']);
    expect(emitidos[0].parametros.destino).toBe(site.redes.instagram);
  });
});
