import { expect, test as base, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';

export interface LlamadaGtag {
  comando: string;
  nombre: string;
  parametros: Record<string, unknown>;
}

const HOSTS_LOCALES = ['localhost', '127.0.0.1'];

export const test = base.extend<{ bloqueadas: string[] }>({
  bloqueadas: [
    async ({ context }, use) => {
      const bloqueadas: string[] = [];
      await context.route(
        (url) => !HOSTS_LOCALES.includes(url.hostname),
        (ruta) => {
          bloqueadas.push(ruta.request().url());
          return ruta.abort();
        },
      );
      await context.addInitScript(() => {
        const llamadas: unknown[][] = [];
        const capa: unknown[] = [];
        const empujar = capa.push.bind(capa);
        capa.push = (...argumentos: unknown[]) => {
          for (const argumento of argumentos) llamadas.push(Array.from(argumento as ArrayLike<unknown>));
          return empujar(...argumentos);
        };
        (window as unknown as { dataLayer: unknown[] }).dataLayer = capa;
        (window as unknown as { __llamadasGtag: unknown[][] }).__llamadasGtag = llamadas;
      });
      await use(bloqueadas);
    },
    { auto: true },
  ],
});

export { expect };

export const llamadas = (page: Page): Promise<LlamadaGtag[]> =>
  page.evaluate(() =>
    (window as unknown as { __llamadasGtag: unknown[][] }).__llamadasGtag.map(([comando, nombre, parametros]) => ({
      comando: String(comando),
      nombre: typeof nombre === 'string' ? nombre : '',
      parametros: (parametros ?? {}) as Record<string, unknown>,
    })),
  );

export const eventos = async (page: Page): Promise<LlamadaGtag[]> =>
  (await llamadas(page)).filter((llamada) => llamada.comando === 'event');

export const abrir = async (page: Page, ruta: string) => {
  await page.goto(ruta);
  await esperarHidratacion(page);
};

export const eventosTras = async (page: Page, accion: () => Promise<void>): Promise<LlamadaGtag[]> => {
  const antes = (await eventos(page)).length;
  await accion();
  return (await eventos(page)).slice(antes);
};

export const clicEnEnlaceNuevo = (page: Page, href: string) =>
  eventosTras(page, async () => {
    await page.evaluate((destino) => {
      const enlace = document.createElement('a');
      enlace.id = 'enlace-de-prueba';
      enlace.setAttribute('href', destino);
      enlace.textContent = 'enlace de prueba';
      enlace.addEventListener('click', (evento) => evento.preventDefault());
      document.body.append(enlace);
    }, href);
    await page.locator('#enlace-de-prueba').click();
    await page.evaluate(() => document.getElementById('enlace-de-prueba')?.remove());
  });
