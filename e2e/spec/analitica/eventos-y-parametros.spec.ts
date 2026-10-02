import { muestras } from '../_muestras';
import { abrir, clicEnEnlaceNuevo, eventosTras, expect, llamadas, test } from './_ga4';

const parametros = (evento: { parametros: Record<string, unknown> }) => Object.keys(evento.parametros).sort();

test.describe('[analitica] Eventos y parámetros', () => {
  test('page_view lo emite config al cargar', async ({ page }) => {
    await abrir(page, '/');
    const configs = (await llamadas(page)).filter((llamada) => llamada.comando === 'config');
    expect(configs).toHaveLength(1);
    expect(configs[0].nombre).toBe('G-TEST');
    expect(configs[0].parametros.send_page_view).not.toBe(false);
    expect((await llamadas(page)).filter((llamada) => llamada.comando === 'event')).toEqual([]);
  });

  test('Click a una publicación', async ({ page }) => {
    await abrir(page, '/contacto/');
    const emitidos = await clicEnEnlaceNuevo(page, 'https://articulo.mercadolibre.cl/MLC-1');
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].nombre).toBe('clic_saliente');
    expect(emitidos[0].parametros).toEqual({ destino: 'https://articulo.mercadolibre.cl/MLC-1', pagina: '/contacto/' });
  });

  test('Enlace real de la ficha', async ({ page }) => {
    const ruta = `/productos/${muestras.fichaSimple.slug}/`;
    await abrir(page, ruta);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    const destino = await cta.getAttribute('href');
    expect(destino).toContain('mercadolibre.cl');
    await cta.evaluate((elemento) => elemento.addEventListener('click', (evento) => evento.preventDefault()));
    const emitidos = await eventosTras(page, () => cta.click());
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].nombre).toBe('clic_saliente');
    expect(emitidos[0].parametros).toEqual({ destino, pagina: ruta });
  });

  test('Parámetros de cada evento de clic', async ({ page }) => {
    await abrir(page, '/');
    const saliente = await clicEnEnlaceNuevo(page, 'https://articulo.mercadolibre.cl/MLC-2');
    const red = await clicEnEnlaceNuevo(page, 'https://www.instagram.com/agas/');
    const contacto = await clicEnEnlaceNuevo(page, 'mailto:ventas@agas.cl');
    expect([saliente, red, contacto].map((emitidos) => emitidos.map((evento) => evento.nombre))).toEqual([
      ['clic_saliente'],
      ['clic_red_social'],
      ['clic_contacto'],
    ]);
    for (const [evento] of [saliente, red, contacto]) {
      expect(parametros(evento)).toEqual(['destino', 'pagina']);
      expect(evento.parametros.pagina).toBe('/');
    }
  });

  test('Parámetros de busqueda', async ({ page }) => {
    await page.clock.install();
    await abrir(page, '/productos/');
    const emitidos = await eventosTras(page, async () => {
      await page.getByRole('searchbox').fill('Fúnda');
      await page.clock.runFor(1600);
    });
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].nombre).toBe('busqueda');
    expect(parametros(emitidos[0])).toEqual(['pagina', 'resultados', 'termino']);
    expect(emitidos[0].parametros.pagina).toBe('/productos/');
    expect(typeof emitidos[0].parametros.resultados).toBe('number');
    expect(emitidos[0].parametros.termino).toBe('funda');
  });
});
