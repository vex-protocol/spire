import type { Device, User, UserRecord } from "@vex-chat/types";
import type { Request } from "express";

/**
 * Strips password fields from a DB user record, returning the
 * public-safe User shape.
 */
export const censorUser = (user: UserRecord): User => {
    return {
        lastSeen: user.lastSeen,
        userID: user.userID,
        username: user.username,
    };
};

/**
 * Safely extract the authenticated device from a request.
 * Throws if the device is not set.
 */
export function getDevice(req: Request): Device {
    if (!req.device) throw new Error("No device");
    return req.device;
}

/**
 * Safely extract a required route parameter.
 * Throws if the parameter is missing or is an array.
 */
export function getParam(req: Request, name: string): string {
    const value = req.params[name];
    if (!value || Array.isArray(value)) {
        throw new Error("Missing route parameter: " + name);
    }
    return value;
}

/**
 * Safely extract the authenticated user from a request.
 * Throws if the user is not set (i.e. protect middleware was not applied).
 */
export function getUser(req: Request): User {
    if (!req.user) throw new Error("Not authenticated");
    return req.user;
}
