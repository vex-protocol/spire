/**
 * Local stress harness against a running Spire (e.g. Docker on port 8080).
 *
 * Prerequisites:
 * - Spire and this script must share the same `SPIRE_STRESS_BYPASS_KEY` (see
 *   `.env.example`). That header skips in-process rate limits only when the
 *   server env var is set.
 * - `NODE_ENV` must be `development` or `test` for libvex `unsafeHttp` (this
 *   script forces `development` when unset).
 *
 * @example
 * SPIRE_STRESS_BYPASS_KEY=dev-secret SPIRE_STRESS_HOST=127.0.0.1:8080 \
 *   npm run stress:local
 *
 * @example
 * Reuse an existing account (recommended for higher `SPIRE_STRESS_CLIENTS`):
 * SPIRE_STRESS_USERNAME=alice SPIRE_STRESS_PASSWORD='…' npm run stress:local
 */

import type { Client } from "@vex-chat/libvex";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import axios from "axios";
import { config } from "dotenv";

import { SPIRE_STRESS_BYPASS_HEADER } from "../../src/server/rateLimit.ts";

async function oneRound(
    client: Client,
    scenario: string,
    concurrency: number,
): Promise<void> {
    switch (scenario) {
        case "whoami":
            await Promise.all(
                Array.from({ length: concurrency }, () => client.whoami()),
            );
            return;
        case "servers":
            await Promise.all(
                Array.from({ length: concurrency }, () =>
                    client.servers.retrieve(),
                ),
            );
            return;
        default:
            // Half GET /user/.../servers, half GET /user/.../permissions — mixed read load.
            await Promise.all(
                Array.from({ length: concurrency }, (_, i) =>
                    i % 2 === 0
                        ? client.servers.retrieve()
                        : client.permissions.retrieve(),
                ),
            );
    }
}

async function bootstrapClient(host: string): Promise<Client> {
    const { Client } = await import("@vex-chat/libvex");
    const dbFolder = join(tmpdir(), `spire-stress-${randomUUID()}`);
    mkdirSync(dbFolder, { recursive: true });

    const c = await Client.create(undefined, {
        dbFolder,
        host,
        inMemoryDb: true,
        unsafeHttp: true,
    });

    const existingUser = process.env["SPIRE_STRESS_USERNAME"];
    const existingPass = process.env["SPIRE_STRESS_PASSWORD"];

    if (existingUser !== undefined && existingUser.length > 0) {
        if (existingPass === undefined) {
            throw new Error(
                "SPIRE_STRESS_PASSWORD is required when SPIRE_STRESS_USERNAME is set.",
            );
        }
        const loginRes = await c.login(existingUser, existingPass);
        if (!loginRes.ok) {
            throw new Error(loginRes.error ?? "login failed");
        }
    } else {
        const password =
            process.env["SPIRE_STRESS_REGISTER_PASSWORD"] ??
            "StressPassw0rd!localonly";
        const username = Client.randomUsername();
        const [, regErr] = await c.register(username, password);
        if (regErr) {
            throw regErr;
        }
        const loginRes = await c.login(username, password);
        if (!loginRes.ok) {
            throw new Error(loginRes.error ?? "login after register failed");
        }
    }

    if (process.env["SPIRE_STRESS_WS"] === "1") {
        await c.connect();
    }

    return c;
}

async function main(): Promise<void> {
    config();

    if (
        process.env["NODE_ENV"] !== "development" &&
        process.env["NODE_ENV"] !== "test"
    ) {
        process.env["NODE_ENV"] = "development";
    }

    const bypass = process.env["SPIRE_STRESS_BYPASS_KEY"];
    if (!bypass) {
        process.stderr.write(
            "SPIRE_STRESS_BYPASS_KEY is required (must match the value set on the Spire process).\n",
        );
        process.exit(1);
    }

    axios.defaults.headers.common[SPIRE_STRESS_BYPASS_HEADER] = bypass;

    const host = process.env["SPIRE_STRESS_HOST"] ?? "127.0.0.1:16777";
    const concurrency = Math.max(
        1,
        Number(process.env["SPIRE_STRESS_CONCURRENCY"] ?? "200"),
    );
    const rounds = Math.max(
        1,
        Number(process.env["SPIRE_STRESS_ROUNDS"] ?? "10"),
    );
    const scenario = process.env["SPIRE_STRESS_SCENARIO"] ?? "mixed";
    const clientCount = Math.max(
        1,
        Number(process.env["SPIRE_STRESS_CLIENTS"] ?? "1"),
    );

    const clients: Client[] = [];
    for (let i = 0; i < clientCount; i++) {
        // Sequential boot avoids registration / DB races when spinning many clients.
        clients.push(await bootstrapClient(host));
    }

    const times: number[] = [];
    for (let r = 0; r < rounds; r++) {
        const t0 = Date.now();
        await Promise.all(
            clients.map((c) => oneRound(c, scenario, concurrency)),
        );
        const dt = Date.now() - t0;
        times.push(dt);
        process.stdout.write(
            `round ${String(r + 1)}/${String(rounds)} wall=${String(dt)}ms clients=${String(clientCount)} concurrency=${String(concurrency)} scenario=${scenario}\n`,
        );
    }

    times.sort((a, b) => a - b);
    const p50 = times[Math.floor((times.length - 1) / 2)] ?? 0;
    const p95 = times[Math.floor(times.length * 0.95)] ?? times.at(-1) ?? 0;

    process.stdout.write(
        JSON.stringify(
            {
                clientCount,
                concurrency,
                host,
                p50_ms: p50,
                p95_ms: p95,
                rounds,
                scenario,
                total_wall_ms: times.reduce((a, b) => a + b, 0),
            },
            null,
            2,
        ) + "\n",
    );

    await Promise.all(clients.map((c) => c.close()));
}

void main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(msg + "\n");
    process.exit(1);
});
