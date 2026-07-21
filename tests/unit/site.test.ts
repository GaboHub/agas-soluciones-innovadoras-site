import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const siteJsonPath = path.resolve(dirname, '../../src/data/site.json');

const site = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));

describe('site.json', () => {
  it('tiene el campo envio no vacío', () => {
    expect(typeof site.envio).toBe('string');
    expect(site.envio.length).toBeGreaterThan(0);
  });
});
