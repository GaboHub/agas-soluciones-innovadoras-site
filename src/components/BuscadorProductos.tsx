import { useEffect, useMemo, useRef, useState } from 'react';
import { crearMedidorBusqueda } from '../lib/analitica';
import Icono from './Icono';
import { SIZES_TARJETA } from '../lib/imagenes-tarjeta';

export interface ProductoBuscable {
  slug: string;
  url: string;
  titulo: string;
  categoriaNombre: string;
  precioTexto: string;
  promedio: number | null;
  cantidad: number | null;
  atributos: string[];
  imagen: {
    src: string;
    width: number;
    height: number;
    srcSet?: string;
  };
}

const ANUNCIO_SIN_RESULTADOS = 'Sin resultados para tu búsqueda';

interface Props {
  productos: ProductoBuscable[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function Estrellitas({ promedio, cantidad }: { promedio: number; cantidad: number }) {
  const llenas = Math.round(promedio);
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden="true" className="flex gap-0.5 text-acento">
        {Array.from({ length: 5 }).map((_, indice) => (
          <svg
            key={indice}
            data-ilustracion
            viewBox="0 0 24 24"
            fill={indice < llenas ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <path d="M12 2.5 14.9 8.6 21.6 9.4 16.8 14 18 20.6 12 17.4 6 20.6 7.2 14 2.4 9.4 9.1 8.6Z" />
          </svg>
        ))}
      </span>
      <span className="font-texto text-sm font-bold text-tinta">{promedio.toFixed(1)}</span>
      <span className="font-texto text-sm text-tinta/70">({cantidad})</span>
      <span className="sr-only">{promedio.toFixed(1)} de 5 estrellas</span>
    </span>
  );
}

export default function BuscadorProductos({ productos }: Props) {
  const [consulta, setConsulta] = useState('');

  const indexados = useMemo(
    () =>
      productos.map((producto) => ({
        producto,
        texto: normalizar(
          [producto.titulo, producto.categoriaNombre, ...producto.atributos].join(' '),
        ),
      })),
    [productos],
  );

  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  const resultados =
    terminos.length === 0
      ? productos
      : indexados
          .filter(({ texto }) => terminos.every((termino) => texto.includes(termino)))
          .map(({ producto }) => producto);

  const medidorRef = useRef(crearMedidorBusqueda());

  useEffect(() => {
    setConsulta(new URLSearchParams(location.search).get('q') ?? '');
  }, []);

  function escribirConsulta(valor: string) {
    setConsulta(valor);
    const url = new URL(location.href);
    if (valor === '') url.searchParams.delete('q');
    else url.searchParams.set('q', valor);
    history.replaceState(history.state, '', url);
  }

  useEffect(() => {
    const medidor = medidorRef.current;
    medidor.programar(consulta, resultados.length, location.pathname);
    return () => medidor.cancelar();
  }, [consulta, resultados.length]);

  return (
    <div className="flex flex-col gap-6">
      <label className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-primario">
        <Icono nombre="buscar" className="h-5 w-5 text-tinta/70" />
        <span className="sr-only">Buscar productos</span>
        <input
          type="search"
          value={consulta}
          onChange={(evento) => escribirConsulta(evento.target.value)}
          placeholder="Busca por producto, consola, color o diseño…"
          className="w-full bg-transparent font-texto text-base text-tinta placeholder:text-tinta/70"
        />
      </label>

      <p role="status" className="sr-only">
        {resultados.length === 0 ? ANUNCIO_SIN_RESULTADOS : `${resultados.length} productos`}
      </p>

      {resultados.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
          <p className="font-titulos text-xl font-bold text-tinta">No encontramos productos para tu búsqueda</p>
          <p className="font-texto text-tinta/70">Prueba con otra palabra o revisa el catálogo completo.</p>
          <button
            type="button"
            onClick={() => escribirConsulta('')}
            className="rounded-xl bg-primario px-6 py-2.5 font-texto font-bold text-white transition-colors hover:bg-primario-oscuro active:translate-y-[2px]"
          >
            Ver catálogo completo
          </button>
        </div>
      ) : (
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resultados.map((producto, indice) => (
            <li key={producto.slug}>
              <a
                href={producto.url}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 motion-safe:transition-transform motion-safe:hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-center bg-white p-4">
                  <img
                    src={producto.imagen.src}
                    width={producto.imagen.width}
                    height={producto.imagen.height}
                    srcSet={producto.imagen.srcSet}
                    sizes={SIZES_TARJETA}
                    alt={producto.titulo}
                    loading={indice < 4 ? 'eager' : 'lazy'}
                    className="h-40 w-auto object-contain sm:h-44"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 border-t border-primario-claro p-5">
                  <p className="font-texto text-xs font-bold tracking-wide text-destacado-oscuro uppercase">
                    {producto.categoriaNombre}
                  </p>
                  <p className="font-titulos text-base font-bold text-tinta">{producto.titulo}</p>
                  {producto.promedio !== null && producto.cantidad !== null && (
                    <Estrellitas promedio={producto.promedio} cantidad={producto.cantidad} />
                  )}
                  <p className="mt-auto pt-2 font-titulos text-lg font-bold text-primario">
                    {producto.precioTexto}
                    <span className="block font-texto text-xs font-normal text-tinta/70">Precio referencial</span>
                  </p>
                  <span className="inline-flex items-center gap-1 font-texto text-sm font-bold text-acento-oscuro group-hover:text-primario">
                    Ver producto
                    <Icono nombre="flecha-derecha" className="h-4 w-4" />
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
