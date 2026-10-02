import { expect, test, type Page } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { paginasDeMuestra } from '../_muestras';

const secciones = [
  { nombre: 'Inicio', href: '/' },
  { nombre: 'Productos', href: '/productos/' },
  { nombre: 'Promociones', href: '/promociones/' },
  { nombre: 'Guías', href: '/guias/' },
  { nombre: 'Preguntas frecuentes', href: '/preguntas-frecuentes/' },
  { nombre: 'Contacto', href: '/contacto/' },
];

const interiores = [
  { nombre: 'Todos los productos', href: '/productos/' },
  ...site.categorias.map((categoria) => ({ nombre: categoria.nombre, href: `/categorias/${categoria.slug}/` })),
  { nombre: 'Promociones', href: '/promociones/' },
  { nombre: 'Guías', href: '/guias/' },
  { nombre: 'Preguntas frecuentes', href: '/preguntas-frecuentes/' },
  { nombre: 'Contacto', href: '/contacto/' },
  { nombre: 'Términos y condiciones', href: '/terminos-y-condiciones/' },
];

const externos = [
  { nombre: 'Tienda en Mercado Libre', href: site.mercadolibre.tienda },
  { nombre: 'Página oficial en Mercado Libre', href: site.mercadolibre.paginaOficial },
  { nombre: 'Instagram', href: site.redes.instagram },
];

const abrirMenu = async (page: Page) => {
  await page.goto('/');
  const boton = page.getByRole('banner').getByLabel(/menú/i);
  await boton.click();
  const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
  await expect(menu).toBeVisible();
  return { boton, menu };
};

test.describe('[sitio] Navegación global', () => {
  test('Enlaces del header', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'el nav de escritorio no se muestra en móvil');
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      const header = page.getByRole('banner');
      const navegacion = header.getByRole('navigation', { name: 'Navegación principal' });
      const enlaces = await navegacion
        .getByRole('link')
        .evaluateAll((items) => items.map((item) => ({ nombre: item.textContent?.trim(), href: item.getAttribute('href') })));
      expect(enlaces, ruta).toEqual([
        ...secciones.map((seccion) => ({ nombre: seccion.nombre, href: seccion.href })),
        { nombre: site.ctaHeader, href: site.mercadolibre.tienda },
      ]);
      expect(await header.evaluate((elemento) => getComputedStyle(elemento).position), ruta).toBe('sticky');
    }
  });

  test('Menú móvil', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'el menú móvil solo aplica al viewport móvil');
    const { menu } = await abrirMenu(page);
    const enlaces = await menu
      .getByRole('link')
      .evaluateAll((items) => items.map((item) => ({ nombre: item.textContent?.trim(), href: item.getAttribute('href') })));
    expect(enlaces).toEqual([
      ...secciones.map((seccion) => ({ nombre: seccion.nombre, href: seccion.href })),
      { nombre: site.ctaHeader, href: site.mercadolibre.tienda },
    ]);
    await page.evaluate(() =>
      document.addEventListener(
        'click',
        (evento) => {
          if ((evento.target as Element).closest('a')) evento.preventDefault();
        },
        true,
      ),
    );
    for (const seccion of secciones) {
      if (await menu.isHidden()) await page.getByRole('banner').getByLabel(/menú/i).click();
      await expect(menu).toBeVisible();
      await menu.getByRole('link', { name: seccion.nombre, exact: true }).click();
      await expect(menu).toBeHidden();
    }
  });

  test('Menú móvil: se cierra al tocar fuera', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'el menú móvil solo aplica al viewport móvil');
    const { menu } = await abrirMenu(page);
    await page.getByRole('main').click({ position: { x: 5, y: 5 } });
    await expect(menu).toBeHidden();
  });

  test('Menú móvil: Escape lo cierra y devuelve el foco al botón', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'el menú móvil solo aplica al viewport móvil');
    const { boton, menu } = await abrirMenu(page);
    await menu.getByRole('link', { name: 'Productos', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test('Footer', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      const footer = page.getByRole('contentinfo');
      for (const enlace of [...interiores, ...externos]) {
        await expect(footer.getByRole('link', { name: enlace.nombre, exact: true }), `${ruta}: ${enlace.nombre}`).toHaveAttribute(
          'href',
          enlace.href,
        );
      }
      await expect(footer.getByText(site.ubicacion)).toBeVisible();
      await expect(footer.getByText(site.cobertura)).toBeVisible();
      await expect(footer.getByText(site.contacto.ventasVolumen)).toBeVisible();
      await expect(footer.getByRole('link', { name: site.contacto.email })).toHaveAttribute('href', `mailto:${site.contacto.email}`);
      await expect(footer.getByText(site.razonSocial)).toBeVisible();
    }
  });
});
