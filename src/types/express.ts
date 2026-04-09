import type { Device, User } from "@vex-chat/types";

/**
 * Augment Express's global Request interface with the properties
 * set by checkAuth and checkDevice middleware.
 *
 * The global Express.Request is merged into express-serve-static-core's
 * Request via `extends Express.Request`, so properties added here are
 * available on `req` in all route handlers.
 */
declare global {
    namespace Express {
        interface Request {
            bearerToken?: string;
            device?: Device;
            exp?: number;
            user?: User;
        }
    }
}

export {};
