import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import reactRenderer from '@astrojs/react/server.js';

export const crearContenedor = async () => {
  const contenedor = await AstroContainer.create();
  contenedor.addServerRenderer({ name: '@astrojs/react', renderer: reactRenderer });
  return contenedor;
};
