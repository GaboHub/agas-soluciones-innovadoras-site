import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  extraerCaracteristicasEIncluye,
  extraerCuerpoYFaqs,
  extraerResumen,
} from '../../../scripts/generar-catalogo.mjs';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha } from './_arnes';

type Ficha = ReturnType<typeof leerFicha>;

let contexto: string;
let raiz: string;
let ficha: Ficha;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  ficha = leerFicha(raiz, 'descripcion-rica');
});

afterAll(() => {
  borrar(contexto, raiz);
});

describe('[catalogo] Limpieza de la descripción', () => {
  it('Condiciones de venta', () => {
    const { cuerpo } = extraerCuerpoYFaqs('Primer párrafo de prueba.\n\nCondiciones de venta: no publicar esto.\n\nTampoco esto.');
    expect(cuerpo).toBe('Primer párrafo de prueba.');
    expect(ficha.content).not.toMatch(/condiciones de venta|no debe publicarse|tampoco debe publicarse/i);
  });

  it('Preguntas frecuentes', () => {
    const { cuerpo, faqs } = extraerCuerpoYFaqs('Texto previo.\n\nPreguntas frecuentes: P: a R: b');
    expect(faqs).toEqual([{ pregunta: 'a', respuesta: 'b' }]);
    expect(cuerpo).toBe('Texto previo.');
    expect(ficha.data.faqs).toEqual([{ pregunta: '¿Es de prueba?', respuesta: 'Sí, solo existe en la fixture.' }]);
  });

  it('las preguntas se leen también con «¿…?» y con línea terminada en «?»', () => {
    const conSignos = extraerCuerpoYFaqs('Texto.\n\nPreguntas frecuentes:\n¿Uno?\nRespuesta uno.\n¿Dos?\nRespuesta dos.');
    expect(conSignos.faqs).toEqual([
      { pregunta: '¿Uno?', respuesta: 'Respuesta uno.' },
      { pregunta: '¿Dos?', respuesta: 'Respuesta dos.' },
    ]);
    const porLinea = extraerCuerpoYFaqs('Texto.\n\nPreguntas frecuentes\nPregunta uno?\nRespuesta uno\nPregunta dos?\nRespuesta dos');
    expect(porLinea.faqs).toEqual([
      { pregunta: 'Pregunta uno?', respuesta: 'Respuesta uno' },
      { pregunta: 'Pregunta dos?', respuesta: 'Respuesta dos' },
    ]);
  });

  it('Frase de contenido del kit', () => {
    const { incluye } = extraerCaracteristicasEIncluye('El kit incluye 2 fundas, 4 grips y 1 estuche.');
    expect(incluye).toEqual(['2 fundas', '4 grips', '1 estuche']);
    expect(ficha.data.incluye).toEqual(['2 fundas', '4 grips', '1 estuche']);
  });

  it('la frase de contenido se reconoce dentro de un párrafo', () => {
    const { incluye } = extraerCaracteristicasEIncluye('Para tu consola, el kit incluye 2 fundas, 4 grips y 1 estuche. Es ideal para viajes.');
    expect(incluye).toEqual(['2 fundas', '4 grips', '1 estuche']);
  });

  it('el incluye también sale de la lista tras «qué incluye» o «contenido del paquete»', () => {
    expect(extraerCaracteristicasEIncluye('Qué incluye:\n- Una funda\n- Un cable').incluye).toEqual(['Una funda', 'Un cable']);
    expect(extraerCaracteristicasEIncluye('Contenido del paquete:\n* Un estuche').incluye).toEqual(['Un estuche']);
  });

  it('el cuerpo no trae párrafos de plantilla ni líneas-etiqueta', () => {
    expect(ficha.content).not.toMatch(/bienvenid|somos una tienda online|aquí tienes la redacción|^---$/im);
    expect(ficha.content).not.toMatch(/Descripción del producto|Características principales y especificaciones/);
    expect(ficha.content).toContain('Este es el primer párrafo útil del producto.');
  });

  it('las características salen de las viñetas', () => {
    expect(ficha.data.caracteristicas).toEqual(['Material resistente de prueba.', 'Compatible con la consola de prueba.']);
  });

  it('el resumen son las 2 primeras oraciones del primer párrafo que no es viñeta', () => {
    const sinDobleEspacio = (texto: string) => texto.replace(/\s+/g, ' ');
    expect(sinDobleEspacio(extraerResumen('- viñeta\n\nUno. Dos. Tres.'))).toBe('Uno. Dos.');
    expect(sinDobleEspacio(ficha.data.resumen)).toBe('Este es el primer párrafo útil del producto. Tiene tres oraciones.');
  });
});
