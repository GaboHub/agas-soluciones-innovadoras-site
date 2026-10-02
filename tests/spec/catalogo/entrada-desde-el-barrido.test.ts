import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { borrar, crearContexto, crearRaizCurada, existe, generar, hashDeArbol, RAIZ_REPO } from './_arnes';
import { main } from '../../../scripts/generar-catalogo.mjs';

const script = path.join(RAIZ_REPO, 'scripts/generar-catalogo.mjs');

const ejecutar = (contexto: string) =>
  spawnSync(process.execPath, [script], { env: { ...process.env, AGAS_CONTEXT_DIR: contexto }, encoding: 'utf-8' });

let temporales: string[] = [];

beforeEach(() => {
  temporales = [];
});

afterEach(() => {
  borrar(...temporales);
});

const temporal = () => {
  const directorio = mkdtempSync(path.join(tmpdir(), 'entrada-'));
  temporales.push(directorio);
  return directorio;
};

describe('[catalogo] Entrada desde el barrido', () => {
  it('Barrido ausente', () => {
    const contexto = temporal();
    const antes = hashDeArbol(path.join(RAIZ_REPO, 'content/productos'));
    const resultado = ejecutar(contexto);
    expect(resultado.status).toBe(1);
    expect(hashDeArbol(path.join(RAIZ_REPO, 'content/productos'))).toBe(antes);
  });

  it('Directorio configurable', () => {
    const contexto = temporal();
    const resultado = ejecutar(contexto);
    expect(resultado.stdout).toContain(`Leyendo contexto desde: ${contexto}`);
    expect(resultado.stderr).toContain(path.join(contexto, 'publicaciones'));
  });

  it('sin publicaciones/ no toca ninguna salida', async () => {
    const contexto = temporal();
    writeFileSync(path.join(contexto, 'empresa.md'), '# X\n');
    const raiz = crearRaizCurada();
    temporales.push(raiz);
    const antes = hashDeArbol(raiz);
    await expect(main({ contexto, raiz })).rejects.toThrow('publicaciones');
    expect(hashDeArbol(raiz)).toBe(antes);
  });

  it('sin empresa.md no toca ninguna salida', async () => {
    const contexto = temporal();
    mkdirSync(path.join(contexto, 'publicaciones'));
    const raiz = crearRaizCurada();
    temporales.push(raiz);
    const antes = hashDeArbol(raiz);
    await expect(main({ contexto, raiz })).rejects.toThrow('empresa.md');
    expect(hashDeArbol(raiz)).toBe(antes);
  });

  it('lee el barrido completo cuando existe', async () => {
    const contexto = await crearContexto();
    const raiz = crearRaizCurada();
    temporales.push(contexto, raiz);
    await generar({ contexto, raiz });
    expect(existe(raiz, 'content/productos/lamina-fixture.md')).toBe(true);
  });

  it('importar el módulo no ejecuta main ni modifica archivos', async () => {
    const contexto = await crearContexto();
    const raiz = crearRaizCurada();
    temporales.push(contexto, raiz);
    mkdirSync(path.join(raiz, 'scripts'));
    cpSync(script, path.join(raiz, 'scripts/generar-catalogo.mjs'));
    symlinkSync(path.join(RAIZ_REPO, 'node_modules'), path.join(raiz, 'node_modules'));
    const antes = hashDeArbol(raiz, ['node_modules']);
    const resultado = spawnSync(
      process.execPath,
      ['-e', `import(${JSON.stringify(path.join(raiz, 'scripts/generar-catalogo.mjs'))}).then(() => console.log('importado'))`],
      { env: { ...process.env, AGAS_CONTEXT_DIR: contexto }, encoding: 'utf-8' },
    );
    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain('importado');
    expect(resultado.stdout).not.toContain('Leyendo contexto');
    expect(existe(raiz, 'content/productos/huerfano.md')).toBe(true);
    expect(hashDeArbol(raiz, ['node_modules'])).toBe(antes);
  });
});
