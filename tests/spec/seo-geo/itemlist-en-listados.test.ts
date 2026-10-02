import { describe, expect, it } from 'vitest';
import { buildItemList } from '../../../src/lib/seo';

describe('[seo-geo] ItemList en listados', () => {
  it('Orden visible', () => {
    const urls = [
      'https://agassoluciones.cl/productos/b/',
      'https://agassoluciones.cl/productos/a/',
      'https://agassoluciones.cl/productos/c/',
    ];
    const lista = JSON.parse(JSON.stringify(buildItemList(urls)));
    expect(lista['@type']).toBe('ItemList');
    expect(lista.itemListElement).toEqual(
      urls.map((url, indice) => ({ '@type': 'ListItem', position: indice + 1, url })),
    );
  });
});
