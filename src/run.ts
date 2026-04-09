import type { SpireOptions } from "./Spire.ts";

import { Spire } from "./Spire.ts";
import { loadEnv } from "./utils/loadEnv.ts";

function parseDbType(value: string | undefined): SpireOptions["dbType"] {
    const valid: SpireOptions["dbType"][] = ["mysql", "sqlite3", "sqlite3mem", "sqlite"];
    if (valid.includes(value as SpireOptions["dbType"])) {
        return value as SpireOptions["dbType"];
    }
    return undefined;
}

async function main() {
    // load the environment variables
    loadEnv();
    const server = new Spire(process.env.SPK!, {
        apiPort: Number(process.env.API_PORT!),
        dbType: parseDbType(process.env.DB_TYPE),
        logLevel: "info",
    });
}

main();
