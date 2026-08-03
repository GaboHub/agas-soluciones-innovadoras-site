declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function destinoSaliente(href: string, dominios: string[]): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const hostname = url.hostname;
  const coincide = dominios.some((dominio) => hostname === dominio || hostname.endsWith(`.${dominio}`));
  return coincide ? href : null;
}
