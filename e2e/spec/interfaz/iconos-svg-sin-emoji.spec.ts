import { expect, test, type Page } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { esperarHidratacion } from '../_hidratacion';
import { muestras, paginasDeMuestra } from '../_muestras';

const rutas = [
  ...paginasDeMuestra,
  `/categorias/${site.categorias[0].slug}/`,
  `/guias/`,
  '/preguntas-frecuentes/',
  '/404.html',
];

const emoji = /(?![©®™])\p{Extended_Pictographic}/u;
const glifoDeIcono = /[✕✔★→←›]/;
const textoDeIcono = new RegExp(`${emoji.source}|${glifoDeIcono.source}`, 'u');

const trazoDeCheck = "d='M20 6 9 17l-5-5'";

const visitar = async (page: Page, ruta: string) => {
  await page.goto(ruta);
  await esperarHidratacion(page);
};

const textosConEmoji = (page: Page) =>
  page.evaluate((patron) => {
    const regla = new RegExp(patron, 'u');
    const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hallazgos: string[] = [];
    for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
      const padre = nodo.parentElement;
      if (!padre || padre.closest('script, style, noscript, [data-resena-cliente]')) continue;
      const texto = nodo.textContent ?? '';
      if (regla.test(texto)) hallazgos.push(texto.trim().slice(0, 50));
    }
    return hallazgos;
  }, textoDeIcono.source);

const contratoDeIconos = (page: Page) =>
  page.evaluate(() => {
    const geometria = 'path, circle, rect, line, polygon, polyline, ellipse';
    const tieneGeometria = (svg: Element) =>
      [...svg.querySelectorAll(geometria)].some((figura) =>
        figura.tagName.toLowerCase() === 'path'
          ? (figura.getAttribute('d') ?? '').trim() !== ''
          : [...figura.attributes].some((atributo) => atributo.value.trim() !== ''),
      );
    const incumplimientos: string[] = [];
    const nombres = new Set<string>();
    for (const svg of document.querySelectorAll('svg')) {
      if (svg.closest('[data-ilustracion]')) continue;
      const nombre = svg.getAttribute('data-icono');
      const donde = `${svg.parentElement?.tagName.toLowerCase()}.${String(svg.parentElement?.getAttribute('class')).slice(0, 40)}`;
      if (nombre === null) {
        incumplimientos.push(`svg sin clasificar en ${donde}`);
        continue;
      }
      nombres.add(nombre);
      const fallas = [
        svg.getAttribute('aria-hidden') !== 'true' && 'aria-hidden',
        svg.getAttribute('stroke') !== 'currentColor' && 'stroke',
        svg.getAttribute('stroke-width') !== '2' && 'stroke-width',
        svg.getAttribute('fill') !== 'none' && 'fill',
        !tieneGeometria(svg) && 'geometría',
      ].filter(Boolean);
      if (fallas.length > 0) incumplimientos.push(`${nombre} en ${donde}: ${fallas.join(', ')}`);
    }
    return { incumplimientos, nombres: [...nombres] };
  });

const agregarCita = (page: Page, conMarca: boolean) =>
  page.evaluate((marca) => {
    const cita = document.createElement('blockquote');
    cita.textContent = 'Control 🎮';
    if (marca) cita.setAttribute('data-resena-cliente', '');
    cita.setAttribute('data-control', 'cita');
    document.body.appendChild(cita);
  }, conMarca);

const nombresAccesibles = async (page: Page, ambito = 'html') => {
  const arbol = await page.locator(ambito).first().ariaSnapshot();
  return [...arbol.matchAll(/^\s*- (?:link|button|heading) "(.*?)"(?: \[[^\]]*\])*(?::.*)?$/gm)].map((coincidencia) => coincidencia[1]);
};

const conGlifo = (nombres: string[]) =>
  nombres.filter((nombre) => emoji.test(nombre) || glifoDeIcono.test(nombre) || nombre === '+');

test.describe('[interfaz] Íconos SVG sin emoji', () => {
  test.setTimeout(180000);

  test('Recorrido de páginas', async ({ page }) => {
    for (const ruta of rutas) {
      await visitar(page, ruta);
      expect(await textosConEmoji(page), ruta).toEqual([]);
    }
    await visitar(page, `/productos/${muestras.fichaConGrupos.slug}/`);
    await page.getByRole('button', { name: /Ampliar foto/ }).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    expect(await textosConEmoji(page), 'visor').toEqual([]);
  });

  test('Nombres accesibles', async ({ page }) => {
    for (const ruta of rutas) {
      await visitar(page, ruta);
      const nombres = await nombresAccesibles(page);
      expect(nombres.length, ruta).toBeGreaterThan(0);
      expect(conGlifo(nombres), ruta).toEqual([]);
    }
    await visitar(page, `/productos/${muestras.fichaConGrupos.slug}/`);
    await page.getByRole('button', { name: /Ampliar foto/ }).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    const delVisor = await nombresAccesibles(page, 'dialog[open]');
    expect(delVisor.length, 'visor').toBeGreaterThanOrEqual(3);
    expect(conGlifo(delVisor), 'visor').toEqual([]);
  });

  test('Viñetas de la home', async ({ page }) => {
    await visitar(page, '/');
    const mascaras = await page.evaluate(() =>
      [...document.querySelectorAll('.contenido-md li')].map((item) => {
        const estilo = getComputedStyle(item, '::before');
        return { contenido: estilo.content, mascara: estilo.maskImage, color: estilo.backgroundColor };
      }),
    );
    expect(mascaras.length).toBeGreaterThan(0);
    expect(mascaras.filter(({ mascara }) => !decodeURIComponent(mascara).includes(trazoDeCheck))).toEqual([]);
  });

  test('Contrato gráfico de los íconos', async ({ page }) => {
    const usados = new Set<string>();
    for (const ruta of rutas) {
      await visitar(page, ruta);
      const { incumplimientos, nombres } = await contratoDeIconos(page);
      expect(incumplimientos, ruta).toEqual([]);
      nombres.forEach((nombre) => usados.add(nombre));
    }
    await visitar(page, `/productos/${muestras.fichaConGrupos.slug}/`);
    await page.getByRole('button', { name: /Ampliar foto/ }).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    const delVisor = await contratoDeIconos(page);
    expect(delVisor.incumplimientos, 'visor').toEqual([]);
    delVisor.nombres.forEach((nombre) => usados.add(nombre));
    expect([...usados]).toEqual(
      expect.arrayContaining(['flecha-derecha', 'flecha-izquierda', 'cerrar', 'check', 'chevron-derecha', 'mas', 'libro', 'camion', 'menu', 'buscar']),
    );
  });

  test('La excepción de emoji cubre solo las reseñas de clientes', async ({ page }) => {
    await visitar(page, '/');
    expect(await textosConEmoji(page)).toEqual([]);
    await agregarCita(page, true);
    expect(await textosConEmoji(page), 'cita de reseña').toEqual([]);
    await page.locator('[data-control="cita"]').evaluate((cita) => cita.remove());
    await agregarCita(page, false);
    expect(await textosConEmoji(page), 'cita fuera de las reseñas').toEqual(['Control 🎮']);
  });

  test('Las reseñas reales llevan la marca de reseña de cliente', async ({ page }) => {
    await visitar(page, '/');
    expect(await page.locator('figure blockquote').count()).toBeGreaterThan(0);
    expect(await page.locator('figure blockquote:not([data-resena-cliente])').count()).toBe(0);
    const comentariosDe = (ficha: (typeof muestras.fichas)[number]) =>
      ((ficha.reviews as { comentarios: { texto: string }[] } | undefined)?.comentarios ?? []).filter(
        (comentario) => comentario.texto.trim().length > 0,
      );
    const conComentarios = muestras.fichas.find((ficha) => comentariosDe(ficha).length > 0)!;
    await visitar(page, `/productos/${conComentarios.slug}/`);
    expect(await page.locator('figure blockquote').count()).toBe(comentariosDe(conComentarios).length);
    expect(await page.locator('figure blockquote:not([data-resena-cliente])').count()).toBe(0);
  });
});
