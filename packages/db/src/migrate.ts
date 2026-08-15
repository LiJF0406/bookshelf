import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createDb, migrate } from "./index.js";
import { defaultDbPath } from "./paths.js";

const dbPath = defaultDbPath();
mkdirSync(dirname(dbPath), { recursive: true });
const { sqlite } = createDb(dbPath);
migrate(sqlite);
console.log(`数据库已初始化：${dbPath}`);
sqlite.close();
