/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/spec/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
