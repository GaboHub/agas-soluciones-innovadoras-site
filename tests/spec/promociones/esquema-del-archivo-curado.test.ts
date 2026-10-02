import { describe, expect, it } from 'vitest';
import promocionesReales from '../../../src/data/promociones.json';
import { promocionesDePrueba } from './_datos';
import { validarPromociones } from './_esquema';

const base = () => structuredClone(promocionesDePrueba);

describe('[promociones] Esquema del archivo curado', () => {
  it('el archivo real cumple el contrato', () => {
    expect(validarPromociones(promocionesReales)).toEqual([]);
    expect(validarPromociones(base())).toEqual([]);
  });

  it('Id repetido', () => {
    const datos = base();
    datos.cupones = [datos.cupones[0], { ...datos.cupones[0] }];
    expect(validarPromociones(datos)).toContain(`cupones: id repetido "${datos.cupones[0].id}"`);
  });

  it('Id de campaña repetido', () => {
    const datos = base();
    datos.campanas = [datos.campanas[0], { ...datos.campanas[0] }];
    expect(validarPromociones(datos)).toContain(`campanas: id repetido "${datos.campanas[0].id}"`);
  });

  it('Ventana invertida', () => {
    const datos = base();
    datos.campanas[0] = { ...datos.campanas[0], desde: '2031-03-20', hasta: '2031-03-10' };
    expect(validarPromociones(datos)).toContain(`campanas[0]: hasta anterior a desde`);
  });

  it('Porcentaje inválido', () => {
    const datos = base();
    datos.cupones[0] = { ...datos.cupones[0], porcentaje: 0 };
    expect(validarPromociones(datos)).toContain('cupones[0]: porcentaje debe ser un entero entre 1 y 99');
    datos.cupones[0] = { ...datos.cupones[0], porcentaje: 12.5 };
    expect(validarPromociones(datos)).toContain('cupones[0]: porcentaje debe ser un entero entre 1 y 99');
    datos.cupones[0] = { ...datos.cupones[0], porcentaje: 100 };
    expect(validarPromociones(datos)).toContain('cupones[0]: porcentaje debe ser un entero entre 1 y 99');
  });

  it('fecha con formato inválido', () => {
    const datos = base();
    datos.cupones[0] = { ...datos.cupones[0], desde: '10-03-2031' };
    expect(validarPromociones(datos)).toContain('cupones[0]: desde debe ser AAAA-MM-DD');
  });

  it('textos vacíos', () => {
    const datos = base();
    datos.aclaracion = '';
    datos.cupones[0] = { ...datos.cupones[0], nombre: '', condicion: ' ' };
    datos.campanas[0] = { ...datos.campanas[0], nombre: '', descripcion: '' };
    expect(validarPromociones(datos)).toEqual(
      expect.arrayContaining([
        'aclaracion vacía',
        'cupones[0]: nombre vacío',
        'cupones[0]: condicion vacío',
        'campanas[0]: nombre vacío',
        'campanas[0]: descripcion vacío',
      ]),
    );
  });

  it('menos de tres faqs o faq con campos vacíos', () => {
    const datos = base();
    datos.faqs = datos.faqs.slice(0, 2);
    expect(validarPromociones(datos)).toContain('faqs: se requieren al menos 3');
    datos.faqs = [...base().faqs];
    datos.faqs[0] = { pregunta: '', respuesta: 'x' };
    expect(validarPromociones(datos)).toContain('faqs[0]: pregunta vacío');
  });
});
