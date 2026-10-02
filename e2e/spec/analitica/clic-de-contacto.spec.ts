import { abrir, clicEnEnlaceNuevo, eventosTras, expect, test } from './_ga4';

test.describe('[analitica] Clic de contacto', () => {
  test('Correo con asunto', async ({ page }) => {
    await abrir(page, '/contacto/');
    const emitidos = await clicEnEnlaceNuevo(page, 'mailto:a@b.cl?subject=Hola');
    expect(emitidos.map((evento) => evento.nombre)).toEqual(['clic_contacto']);
    expect(emitidos[0].parametros).toEqual({ destino: 'a@b.cl', pagina: '/contacto/' });
  });

  test('mailto vacío', async ({ page }) => {
    await abrir(page, '/contacto/');
    expect(await clicEnEnlaceNuevo(page, 'mailto:')).toEqual([]);
    expect(await clicEnEnlaceNuevo(page, 'mailto:?subject=Hola')).toEqual([]);
  });

  test('Otros esquemas y enlaces malformados', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    await abrir(page, '/contacto/');
    for (const href of ['https://example.com/a@b.cl', 'http://example.com/', 'tel:+56911111111', 'mailto', 'http://']) {
      expect(await clicEnEnlaceNuevo(page, href), href).toEqual([]);
    }
    expect(await clicEnEnlaceNuevo(page, 'mailto:c@d.cl')).toHaveLength(1);
    expect(errores).toEqual([]);
  });

  test('Correo del sitio', async ({ page }) => {
    await abrir(page, '/contacto/');
    const enlace = page.locator('main a[href^="mailto:"]').first();
    await expect(enlace).toBeVisible();
    const correo = (await enlace.getAttribute('href'))!.replace('mailto:', '').split('?')[0];
    await enlace.evaluate((elemento) => elemento.addEventListener('click', (evento) => evento.preventDefault()));
    const emitidos = await eventosTras(page, () => enlace.click());
    expect(emitidos.map((evento) => evento.nombre)).toEqual(['clic_contacto']);
    expect(emitidos[0].parametros.destino).toBe(correo);
  });
});
