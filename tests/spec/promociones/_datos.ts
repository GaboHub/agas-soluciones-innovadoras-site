import type { PromocionesData } from '../../../src/lib/promociones';

export const promocionesDePrueba: PromocionesData = {
  aclaracion: 'Aclaración de prueba',
  cupones: [
    {
      id: 'cupon-de-prueba',
      nombre: 'Cupón de prueba',
      porcentaje: 17,
      condicion: 'Condición del cupón de prueba',
      desde: '2031-03-10',
      hasta: '2031-03-20',
    },
    {
      id: 'cupon-de-prueba-dos',
      nombre: 'Cupón de prueba dos',
      porcentaje: 8,
      condicion: 'Condición del segundo cupón',
      desde: '2031-03-12',
      hasta: '2031-03-25',
    },
  ],
  campanas: [
    {
      id: 'campana-de-prueba',
      nombre: 'Campaña de prueba',
      descripcion: 'Descripción de la campaña de prueba',
      desde: '2031-04-01',
      hasta: '2031-04-30',
    },
    {
      id: 'campana-de-prueba-dos',
      nombre: 'Campaña de prueba dos',
      descripcion: 'Descripción de la segunda campaña',
      desde: '2031-03-05',
      hasta: '2031-03-15',
    },
  ],
  faqs: [
    { pregunta: 'Pregunta uno', respuesta: 'Respuesta uno' },
    { pregunta: 'Pregunta dos', respuesta: 'Respuesta dos' },
    { pregunta: 'Pregunta tres', respuesta: 'Respuesta tres' },
  ],
};
