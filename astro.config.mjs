// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { leerFuentesFechadas, lastmodPorRuta } from './src/lib/lastmod.ts';

const lastmod = lastmodPorRuta(leerFuentesFechadas(import.meta.dirname));

export default defineConfig({
  site: 'https://agassoluciones.cl',
  outDir: process.env.AGAS_OUT_DIR ?? 'dist',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      serialize: (item) => {
        const fecha = lastmod[new URL(item.url).pathname];
        return fecha ? { ...item, lastmod: fecha } : item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
