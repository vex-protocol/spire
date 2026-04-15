# @vex-chat/spire

[![npm](https://img.shields.io/npm/v/@vex-chat/spire?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@vex-chat/spire)
[![CI](https://img.shields.io/github/actions/workflow/status/vex-protocol/spire-js/build.yml?branch=master&style=flat-square&logo=github&label=CI)](https://github.com/vex-protocol/spire-js/actions/workflows/build.yml)
[![Released](https://img.shields.io/github/release-date/vex-protocol/spire-js?style=flat-square&label=released)](https://github.com/vex-protocol/spire-js/releases)
[![License](https://img.shields.io/npm/l/@vex-chat/spire?style=flat-square&color=blue)](./LICENSE)
[![Type Coverage](https://img.shields.io/badge/dynamic/json?style=flat-square&label=type-coverage&prefix=%E2%89%A5&suffix=%25&query=$.typeCoverage.atLeast&url=https://raw.githubusercontent.com/vex-protocol/spire-js/master/package.json&color=3178c6&logo=typescript)](https://github.com/plantain-00/type-coverage)
[![Node](https://img.shields.io/node/v/@vex-chat/spire?style=flat-square&color=339933&logo=nodedotjs)](./package.json)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/vex-protocol/spire-js?style=flat-square&label=Scorecard)](https://securityscorecards.dev/viewer/?uri=github.com/vex-protocol/spire-js)
[![Socket](https://socket.dev/api/badge/npm/package/@vex-chat/spire)](https://socket.dev/npm/package/@vex-chat/spire)

Reference server implementation for the [Vex](https://vex.wtf) encrypted chat platform. NodeJS + SQLite + TypeScript, running the wire protocol defined in [@vex-chat/types](https://github.com/vex-protocol/types-js).

## What's in the box

- **REST API** (Express 5) for auth, registration, users, servers, channels, invites, and file upload.
- **WebSocket server** (native `ws`) for real-time messaging, presence, and push notifications. The first client message is JSON (`{ type: 'auth', token }`); after that, binary frames use msgpack (32-byte header + body) per the AsyncAPI spec in `@vex-chat/types`.
- **SQLite persistence** via Kysely + better-sqlite3. Single-file DB, zero external services.
- **Runtime validation** at trust boundaries: REST bodies and route params go through Zod (`safeParse` / regex-backed path segments where used). WebSocket mail payloads use `MailWSSchema` from `@vex-chat/types`; other WS message kinds are checked structurally (size limits, UUIDs, crypto verify) rather than a single Zod envelope for every frame.
- **Interactive docs** — [Scalar](https://scalar.com) at `/docs` for the OpenAPI spec, the [AsyncAPI web component](https://www.asyncapi.com) at `/async-docs` for the WebSocket protocol. Interactive viewers are **disabled when `NODE_ENV=production`** (they rely on relaxed CSP / CDN scripts); raw `/openapi.json` and `/asyncapi.json` stay available.
- **Authentication** via `@vex-chat/crypto` signing keys plus JWT session tokens. **New passwords** are hashed with **Argon2id** (`argon2`); **legacy accounts** still verify with **PBKDF2** (`node:crypto`), then transparently rehash to Argon2id on successful login.

## Install

From public npm:

```sh
npm install @vex-chat/spire
```

Or clone the repo:

```sh
git clone git@github.com:vex-protocol/spire-js
cd spire-js
npm ci
```

## Running the server

Spire runs directly from source via `node --experimental-strip-types` — no pre-compile step needed in dev or prod. From a clone:

```sh
npm start
```

Or equivalently:

```sh
node --experimental-strip-types src/run.ts
```

From an npm install, the source ships in the tarball under `node_modules/@vex-chat/spire/src/`, so you can run it directly:

```sh
node --experimental-strip-types node_modules/@vex-chat/spire/src/run.ts
```

## Configuration

Spire reads configuration from environment variables. Use a `.env` file at the repo root (or wherever you run it from) — `dotenv` picks it up automatically.

### Required

| Variable     | Description                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPK`        | Server private key, hex-encoded. Generate with `npm run gen-spk` (prints `SPK` and `JWT_SECRET` lines). Used for server identity signing (NaCl).                                                                                                                          |
| `JWT_SECRET` | Hex or string used as the **HMAC secret for JWTs** — **required** and must be **separate from `SPK`**. `npm run gen-spk` emits a dedicated value; do not reuse `SPK` here.                                                                                                |
| `DB_TYPE`    | `sqlite`, `sqlite3`, or `sqlite3mem`. All values use **SQLite** via `better-sqlite3` (file or `:memory:`). `sqlite3mem` is for tests. The string `mysql` is still accepted for compatibility but maps to the same SQLite setup as the default (there is no MySQL driver). |
| `CANARY`     | `true` to enable canary mode (runs extra runtime assertions). `false` for standard production.                                                                                                                                                                            |

### Optional

| Variable       | Default   | Description                                                                                                                                             |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_PORT`     | `16777`   | Port for the REST API and WebSocket server (see `Spire` default in code if unset).                                                                      |
| `NODE_ENV`     | _(unset)_ | Set to `production` to disable interactive `/docs` / `/async-docs`. If unset or any other value, doc viewers are mounted. `helmet()` runs in all modes. |
| `CORS_ORIGINS` | _(empty)_ | Comma-separated allowed `Origin` values for `cors`. If unset or empty, **no cross-origin browser access** (`origin: false`).                            |

### Sample `.env`

```sh
# Run `npm run gen-spk` and paste the two lines it prints (SPK + JWT_SECRET).
SPK=a1b2c3...
JWT_SECRET=d4e5f6...
DB_TYPE=sqlite
CANARY=false
API_PORT=16777
NODE_ENV=production
```

## Development

```sh
npm run build         # tsc (sanity check — runtime uses --experimental-strip-types)
npm run lint          # eslint strictTypeChecked
npm run lint:fix      # eslint --fix
npm run format        # prettier --write
npm run format:check
npm test              # vitest run
npx type-coverage     # type-coverage (≥95%)
npm run license:check # license allowlist gate
```

See [AGENTS.md](./AGENTS.md) for the release flow (changesets → publish → deploy-hook) and the rules for writing changesets.

## License

[AGPL-3.0-or-later](./LICENSE)
