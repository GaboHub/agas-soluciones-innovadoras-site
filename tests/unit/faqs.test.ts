import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const faqsJsonPath = path.resolve(dirname, '../../src/data/faqs.json');

describe('faqs.json contenido', () => {
  const faqs = JSON.parse(readFileSync(faqsJsonPath, 'utf-8'));

  it('tiene faqs transversales no vacías', () => {
    expect(Array.isArray(faqs.global)).toBe(true);
    expect(faqs.global.length).toBeGreaterThanOrEqual(4);
  });

  it('cada faq tiene pregunta y respuesta no vacías', () => {
    for (const faq of faqs.global) {
      expect(typeof faq.pregunta).toBe('string');
      expect(faq.pregunta.length).toBeGreaterThan(0);
      expect(typeof faq.respuesta).toBe('string');
      expect(faq.respuesta.length).toBeGreaterThan(0);
    }
  });

  it('las faqs derivan la compra a Mercado Libre', () => {
    const texto = faqs.global.map((faq: { respuesta: string }) => faq.respuesta).join(' ');
    expect(texto).toContain('Mercado Libre');
  });

  it('las faqs mencionan el despacho el mismo día', () => {
    const texto = faqs.global.map((faq: { respuesta: string }) => faq.respuesta).join(' ');
    expect(texto).toContain('mismo día');
  });
});
