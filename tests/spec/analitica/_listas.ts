interface ListasDeDominios {
  dominiosSalientes: string[];
  dominiosRedes: string[];
}

export const destinosEnAmbasListas = ({ dominiosSalientes, dominiosRedes }: ListasDeDominios): string[] =>
  dominiosSalientes.filter((dominio) => dominiosRedes.includes(dominio));

export const dominiosAjenosAlMarketplace = (dominios: string[], urlsDelMarketplace: string[]): string[] => {
  const hosts = urlsDelMarketplace.map((url) => new URL(url).hostname);
  return dominios.filter((dominio) => !hosts.some((host) => host === dominio || host.endsWith(`.${dominio}`)));
};
