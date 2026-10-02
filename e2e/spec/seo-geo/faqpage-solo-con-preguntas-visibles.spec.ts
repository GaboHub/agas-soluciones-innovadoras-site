import { expect, test } from '@playwright/test';
import { bloquesJsonLd } from '../_jsonld';

test.describe('[seo-geo] FAQPage solo con preguntas visibles', () => {
  test('Página de preguntas frecuentes', async ({ page }) => {
    await page.goto('/preguntas-frecuentes/');
    const faq = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    const preguntas = (faq!.mainEntity as { '@type': string; name: string }[]).map((pregunta) => pregunta.name);
    expect(preguntas.length).toBeGreaterThan(0);
    const visible = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    for (const pregunta of preguntas) {
      expect(visible, pregunta).toContain(pregunta.replace(/\s+/g, ' '));
    }
  });

  test('Home', async ({ page }) => {
    await page.goto('/');
    const tipos = (await bloquesJsonLd(page)).map((bloque) => bloque['@type']);
    expect(tipos).not.toContain('FAQPage');
  });
});
