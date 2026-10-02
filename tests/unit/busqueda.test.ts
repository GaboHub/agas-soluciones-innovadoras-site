import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearMedidorBusqueda, normalizarTermino } from '../../src/lib/analitica';

describe('normalizarTermino', () => {
  it('pasa a minúsculas, quita tildes y colapsa espacios', () => {
    expect(normalizarTermino('  Fúnda   Roja ')).toBe('funda roja');
  });

  it('devuelve cadena vacía si solo hay espacios', () => {
    expect(normalizarTermino('   ')).toBe('');
  });
});

describe('crearMedidorBusqueda', () => {
  let gtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    gtag = vi.fn();
    (globalThis as { window?: unknown }).window = { gtag };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  it('emite una única llamada tras 1500ms con termino, resultados y pagina', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('funda', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'busqueda', {
      termino: 'funda',
      resultados: 3,
      pagina: '/productos/',
    });
  });

  it('emite resultados: 0 cuando la búsqueda no tiene matches', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('inexistente', 0, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledWith('event', 'busqueda', {
      termino: 'inexistente',
      resultados: 0,
      pagina: '/productos/',
    });
  });

  it('un término buscado sin gtag no cuenta como emitido: al recuperar gtag se emite', () => {
    (globalThis as { window?: unknown }).window = {};
    const medidor = crearMedidorBusqueda();
    medidor.programar('Funda', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    (globalThis as { window?: unknown }).window = { gtag };
    medidor.programar('FÚNDA', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'busqueda', { termino: 'funda', resultados: 3, pagina: '/productos/' });
  });

  it('reprogramar antes de vencer cancela el disparo anterior y solo emite el último término', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('fun', 5, '/productos/');
    vi.advanceTimersByTime(1000);
    medidor.programar('funda', 3, '/productos/');
    vi.advanceTimersByTime(1000);
    expect(gtag).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'busqueda', {
      termino: 'funda',
      resultados: 3,
      pagina: '/productos/',
    });
  });

  it('no emite si la consulta normaliza a vacío', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('   ', 0, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).not.toHaveBeenCalled();
  });

  it('no re-emite el mismo termino normalizado dos veces seguidas, pero sí tras un termino distinto en el medio', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('Funda', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);

    medidor.programar('funda ', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);

    medidor.programar('otro', 1, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(2);

    medidor.programar('funda', 3, '/productos/');
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(3);
  });

  it('sin window definido no lanza excepción ni llama nada', () => {
    delete (globalThis as { window?: unknown }).window;
    const medidor = crearMedidorBusqueda();
    expect(() => {
      medidor.programar('funda', 3, '/productos/');
      vi.advanceTimersByTime(1500);
    }).not.toThrow();
    expect(gtag).not.toHaveBeenCalled();
  });

  it('con window presente pero sin gtag no lanza excepción ni llama nada', () => {
    (globalThis as { window?: unknown }).window = {};
    const medidor = crearMedidorBusqueda();
    expect(() => {
      medidor.programar('funda', 3, '/productos/');
      vi.advanceTimersByTime(1500);
    }).not.toThrow();
    expect(gtag).not.toHaveBeenCalled();
  });

  it('cancelar() antes de vencer el timer evita la emisión', () => {
    const medidor = crearMedidorBusqueda();
    medidor.programar('funda', 3, '/productos/');
    medidor.cancelar();
    vi.advanceTimersByTime(1500);
    expect(gtag).not.toHaveBeenCalled();
  });
});
