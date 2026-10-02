import raw from '../data/promociones.json' with { type: 'json' };
import type { FaqItem } from './faqs';

export interface Cupon {
  id: string;
  nombre: string;
  porcentaje: number;
  condicion: string;
  desde: string;
  hasta: string;
}

export interface Campana {
  id: string;
  nombre: string;
  descripcion: string;
  desde: string;
  hasta: string;
}

export interface PromocionesData {
  aclaracion: string;
  cupones: Cupon[];
  campanas: Campana[];
  faqs: FaqItem[];
}

export const promociones: PromocionesData = raw as PromocionesData;

export type EstadoPromocion = 'vigente' | 'proxima' | 'expirada';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function hoyEnChile(): string {
  const fijada = process.env.AGAS_FECHA_BUILD;
  if (fijada && FECHA_ISO.test(fijada)) return fijada;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

export function clasificar(promo: { desde: string; hasta: string }, hoy: string): EstadoPromocion {
  if (hoy < promo.desde) return 'proxima';
  if (hoy > promo.hasta) return 'expirada';
  return 'vigente';
}

export function publicables<T extends { desde: string; hasta: string }>(
  items: T[],
  hoy: string,
): Array<T & { estado: EstadoPromocion }> {
  return items
    .map((item) => ({ ...item, estado: clasificar(item, hoy) }))
    .filter((item) => item.estado !== 'expirada')
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === 'vigente' ? -1 : 1;
      return a.desde.localeCompare(b.desde);
    });
}

export function getCuponesPublicables(hoy: string = hoyEnChile()): Array<Cupon & { estado: EstadoPromocion }> {
  return publicables(promociones.cupones, hoy);
}

export function getCampanasPublicables(hoy: string = hoyEnChile()): Array<Campana & { estado: EstadoPromocion }> {
  return publicables(promociones.campanas, hoy);
}
