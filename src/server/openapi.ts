/**
 * Serves the OpenAPI and AsyncAPI specs from @vex-chat/types.
 *
 * The specs are generated at build time from Zod schemas (the single source
 * of truth) — not introspected from Express routes at runtime.
 */
import type express from "express";

import { createRequire } from "node:module";

import swaggerUi from "swagger-ui-express";

const require = createRequire(import.meta.url);

export const setupOpenApiDocs = (api: express.Application) => {
    const openApiSpec = require("@vex-chat/types/openapi.json") as swaggerUi.JsonObject;
    const asyncApiSpec = require("@vex-chat/types/asyncapi.json") as Record<string, unknown>;

    // Raw JSON endpoints
    api.get("/openapi.json", (_req, res) => { res.json(openApiSpec); });
    api.get("/asyncapi.json", (_req, res) => { res.json(asyncApiSpec); });

    // Swagger UI at /docs — spec passed inline, no external fetch needed
    api.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
};
