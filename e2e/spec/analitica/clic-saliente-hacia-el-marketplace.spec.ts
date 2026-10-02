import { abrir, clicEnEnlaceNuevo, expect, test } from './_ga4';

test.describe('[analitica] Clic saliente hacia el marketplace', () => {
  test('Subdominio', async ({ page }) => {
    await abrir(page, '/');
    for (const destino of ['https://articulo.mercadolibre.cl/MLC-1', 'https://mercadolibre.cl/x']) {
      const emitidos = await clicEnEnlaceNuevo(page, destino);
      expect(emitidos.map((evento) => evento.nombre), destino).toEqual(['clic_saliente']);
      expect(emitidos[0].parametros.destino, destino).toBe(destino);
    }
  });

  test('Sufijo sin punto', async ({ page }) => {
    await abrir(page, '/');
    const emitidos = await clicEnEnlaceNuevo(page, 'https://nomercadolibre.cl/x');
    expect(emitidos).toEqual([]);
  });

  test('Relativa y malformada no cuentan', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    await abrir(page, '/');
    for (const href of ['/productos/', 'productos/', 'http://', 'https://', 'http://mercadolibre.cl:abc/']) {
      expect(await clicEnEnlaceNuevo(page, href), href).toEqual([]);
    }
    expect(await clicEnEnlaceNuevo(page, 'https://articulo.mercadolibre.cl/MLC-3')).toHaveLength(1);
    expect(errores).toEqual([]);
  });
});
