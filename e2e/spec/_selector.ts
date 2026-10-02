import type { Page } from '@playwright/test';
import { construirGruposFicha } from '../../src/lib/ficha';
import { muestras } from './_muestras';

export const elegir = async (page: Page, etiqueta: string, indice: number) => {
  const contenedor = page
    .locator(`xpath=//main//*[self::p or self::label][starts-with(normalize-space(.), "${etiqueta}:")]/..`)
    .first();
  const select = contenedor.locator('select');
  if (await select.count()) await select.selectOption({ index: indice });
  else await contenedor.getByRole('button').nth(indice).click();
};

export const enlaceDelCta = (page: Page) =>
  page.locator('[data-cta="ver-en-mercado-libre"]').getAttribute('href');

export const fichasConOpciones = muestras.fichas.map((ficha) => ({
  ficha,
  ...construirGruposFicha(ficha as never),
}));
