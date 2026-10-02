import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import site from '../../../src/data/site.json' with { type: 'json' };
import { paginasDeMuestra } from '../_muestras';
import { abrir, expect, llamadas, test } from './_ga4';

const raiz = path.resolve(import.meta.dirname, '../../..');

const htmlDe = (directorio: string): string[] => {
  const archivos: string[] = [];
  const recorrer = (actual: string) => {
    for (const nombre of readdirSync(actual)) {
      const ruta = path.join(actual, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (nombre.endsWith('.html')) archivos.push(ruta);
    }
  };
  recorrer(directorio);
  return archivos;
};

const valoresDeTexto = (valor: unknown): string[] => {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(valoresDeTexto);
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(valoresDeTexto);
  return [];
};

const { analitica, ...ajenoALaAnalitica } = site;
const textoDeAnalitica = JSON.stringify(analitica);
const datosAjenos = [...new Set(valoresDeTexto(ajenoALaAnalitica))].filter(
  (texto) => texto.length >= 8 && !textoDeAnalitica.includes(texto),
);

const primerosHijosDelHead = (html: string): string[] => {
  const cabecera = /<head[^>]*>/.exec(html);
  if (!cabecera) return [];
  const resto = html.slice(cabecera.index + cabecera[0].length);
  return [...resto.matchAll(/<[a-z][^>]*>/g)].slice(0, 2).map((etiqueta) => etiqueta[0]);
};

test.describe('[analitica] GA4 solo en producción con ID', () => {
  test('Build sin ID', async () => {
    const paginas = htmlDe(path.join(raiz, 'dist'));
    expect(paginas.length).toBeGreaterThan(paginasDeMuestra.length);
    const conGtm = paginas.filter((pagina) => readFileSync(pagina, 'utf-8').includes('googletagmanager'));
    expect(conGtm.map((pagina) => path.relative(raiz, pagina))).toEqual([]);
    const sinCharsetPrimero = paginas
      .filter((pagina) => primerosHijosDelHead(readFileSync(pagina, 'utf-8')).length > 0)
      .filter((pagina) => !/^<meta charset=/.test(primerosHijosDelHead(readFileSync(pagina, 'utf-8'))[0]));
    expect(sinCharsetPrimero.map((pagina) => path.relative(raiz, pagina))).toEqual([]);
    expect(
      paginas.filter((pagina) => primerosHijosDelHead(readFileSync(pagina, 'utf-8')).length > 0).length,
      'páginas con head',
    ).toBeGreaterThan(paginasDeMuestra.length);
  });

  test('Build con ID', async ({ page, request, bloqueadas }) => {
    expect(datosAjenos.length, 'datos de site.json ajenos a analitica').toBeGreaterThan(5);
    for (const ruta of paginasDeMuestra) {
      const html = await (await request.get(ruta)).text();
      const [primero, segundo] = primerosHijosDelHead(html);
      expect(primero, `${ruta}: primer elemento del head`).toMatch(/^<meta charset=/);
      expect(segundo, `${ruta}: segundo elemento del head`).toMatch(/^<link rel="preconnect"/);
      expect(segundo, ruta).toContain('href="https://www.googletagmanager.com"');
      expect(html, ruta).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST');
    }

    await abrir(page, '/');
    expect(bloqueadas.some((url) => url.startsWith('https://www.googletagmanager.com/gtag/js?id=G-TEST'))).toBe(true);
    expect(await llamadas(page)).toEqual(
      expect.arrayContaining([expect.objectContaining({ comando: 'config', nombre: 'G-TEST' })]),
    );

    const origenes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLScriptElement>('script')].map((script) => ({
        src: script.getAttribute('src'),
        texto: script.textContent ?? '',
      })),
    );
    const scripts = await Promise.all(
      origenes
        .filter((origen) => !origen.src?.includes('googletagmanager'))
        .map(async (origen) => (origen.src ? (await request.get(origen.src)).text() : origen.texto)),
    );
    const deEventos = scripts.filter((texto) => texto.includes('clic_saliente'));
    expect(deEventos.length, 'script de eventos').toBeGreaterThan(0);
    for (const texto of deEventos) {
      expect(datosAjenos.filter((dato) => texto.includes(dato))).toEqual([]);
      for (const dominio of analitica.dominiosSalientes) expect(texto).toContain(dominio);
    }
  });
});
