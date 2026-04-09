import type express from "express";

import swaggerUi from "swagger-ui-express";

interface IOpenApiOperation {
    responses: Record<string, { description: string }>;
    summary: string;
}

interface IOpenApiSpec {
    info: {
        description: string;
        title: string;
        version: string;
    };
    openapi: string;
    paths: Record<string, Record<string, IOpenApiOperation>>;
}

interface IRouterMount {
    basePath: string;
    router: express.Router;
}

// Express internal layer shape — used only for runtime introspection of
// the route stack.  We deliberately use loose types because Express does
// not export these interfaces and they vary across major versions.
interface RouteLayer {
    handle?: { stack?: unknown[] };
    route?: {
        methods?: Record<string, boolean>;
        path?: string;
    };
}

function isRouteLayer(value: unknown): value is RouteLayer {
    return typeof value === "object" && value !== null;
}

const normalizePath = (prefix: string, pathValue: string) => {
    const combined = `${prefix}/${pathValue}`.replace(/\/+/g, "/");
    const withParams = combined.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    return withParams.endsWith("/") && withParams.length > 1
        ? withParams.slice(0, -1)
        : withParams;
};

const addOperation = (
    paths: IOpenApiSpec["paths"],
    method: string,
    openApiPath: string,
) => {
    const key = method.toLowerCase();
    const existing = paths[openApiPath];
    if (!existing) {
        paths[openApiPath] = {
            [key]: {
                responses: {
                    "200": { description: "Success" },
                    "400": { description: "Bad request" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Not found" },
                    "500": { description: "Server error" },
                },
                summary: `${method.toUpperCase()} ${openApiPath}`,
            },
        };
    } else {
        existing[key] = {
            responses: {
                "200": { description: "Success" },
                "400": { description: "Bad request" },
                "401": { description: "Unauthorized" },
                "404": { description: "Not found" },
                "500": { description: "Server error" },
            },
            summary: `${method.toUpperCase()} ${openApiPath}`,
        };
    }
};

const collectFromStack = (
    stack: unknown[],
    paths: IOpenApiSpec["paths"],
    prefix = "",
) => {
    for (const rawLayer of stack) {
        if (!isRouteLayer(rawLayer)) continue;
        const layer = rawLayer;

        if (
            layer.route &&
            typeof layer.route.path === "string" &&
            layer.route.methods
        ) {
            const routePath = layer.route.path;
            const openApiPath = normalizePath(prefix, routePath);
            const methods = Object.keys(layer.route.methods);
            for (const method of methods) {
                addOperation(paths, method, openApiPath);
            }
            continue;
        }

        if (layer.handle?.stack && Array.isArray(layer.handle.stack)) {
            collectFromStack(layer.handle.stack, paths, prefix);
        }
    }
};

const createOpenApiSpec = (
    api: express.Application,
    mountedRouters: IRouterMount[],
): IOpenApiSpec => {
    const paths: IOpenApiSpec["paths"] = {};

    // Access Express internal (undocumented) router stack for route introspection.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- introspecting undocumented Express internals
    const appStack: unknown = (api as unknown as Record<string, unknown>)[
        "_router"
    ];
    if (
        typeof appStack === "object" &&
        appStack !== null &&
        "stack" in appStack &&
        Array.isArray(appStack.stack)
    ) {
        collectFromStack(appStack.stack as unknown[], paths);
    }

    for (const { basePath, router } of mountedRouters) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- introspecting undocumented Express internals
        const r: Record<string, unknown> = router as unknown as Record<
            string,
            unknown
        >;
        const stack = r["stack"];
        if (Array.isArray(stack)) {
            collectFromStack(stack as unknown[], paths, basePath);
        }
    }

    return {
        info: {
            description:
                "Auto-generated endpoint reference for the Spire Express API.",
            title: "Spire API",
            version: "1.0.0",
        },
        openapi: "3.1.0",
        paths,
    };
};

export const setupOpenApiDocs = (
    api: express.Application,
    mountedRouters: IRouterMount[],
) => {
    api.get("/docs.json", (_req, res) => {
        res.json(createOpenApiSpec(api, mountedRouters));
    });

    api.use(
        "/docs",
        swaggerUi.serve,
        swaggerUi.setup(undefined, {
            swaggerOptions: {
                url: "/docs.json",
            },
        }),
    );
};
