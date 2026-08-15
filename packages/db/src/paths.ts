import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function findWorkspaceRoot(fromUrl: string): string {
  let dir = dirname(fileURLToPath(fromUrl));
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function defaultDataDir(): string {
  return process.env.BOOKSHELF_DATA_DIR ?? resolve(findWorkspaceRoot(import.meta.url), "data");
}

export function defaultDbPath(): string {
  return resolve(defaultDataDir(), "bookshelf.db");
}

export function defaultCoverDir(): string {
  return resolve(defaultDataDir(), "covers");
}
