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

export function destinoContacto(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'mailto:') return null;
  const correo = url.pathname;
  return correo === '' ? null : correo;
}

export function normalizarTermino(consulta: string): string {
  return consulta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function crearMedidorBusqueda(esperaMs = 1500) {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let ultimoEmitido: string | null = null;

  return {
    programar(consulta: string, resultados: number, pagina: string): void {
      if (temporizador !== undefined) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const termino = normalizarTermino(consulta);
        if (termino === '' || termino === ultimoEmitido) return;
        ultimoEmitido = termino;
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('event', 'busqueda', { termino, resultados, pagina });
        }
      }, esperaMs);
    },
    cancelar(): void {
      if (temporizador !== undefined) clearTimeout(temporizador);
    },
  };
}
