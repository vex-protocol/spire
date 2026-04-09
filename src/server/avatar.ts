import type { Database } from "../Database.ts";
import type { Device } from "@vex-chat/types";
import type { User } from "@vex-chat/types";
import type winston from "winston";

import * as fs from "node:fs";

import express from "express";

import { XUtils } from "@vex-chat/crypto";
import { filePayload } from "@vex-chat/types";

import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import multer from "multer";
import { z } from "zod/v4";

import { ALLOWED_IMAGE_TYPES, protect } from "./index.ts";

const safePathParam = z.string().regex(/^[a-zA-Z0-9._-]+$/);

export const getAvatarRouter = (db: Database, log: winston.Logger) => {
    const router = express.Router();

    router.get("/:userID", async (req, res) => {
        const safeId = safePathParam.safeParse(req.params.userID);
        if (!safeId.success) {
            res.sendStatus(400);
            return;
        }
        const filePath = "./avatars/" + safeId.data;
        const typeDetails = await fileTypeFromFile(filePath).catch(() => null);
        if (!typeDetails) {
            res.sendStatus(404);
            return;
        }
        res.set("Content-type", typeDetails.mime);
        res.set("Cache-control", "public, max-age=31536000");

        const stream = fs.createReadStream(filePath);
        stream.on("error", (err) => {
            log.error(err.toString());
            res.sendStatus(500);
        });
        stream.pipe(res);
    });

    router.post("/:userID/json", protect, async (req, res) => {
        const parsed = filePayload.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid file payload",
                issues: parsed.error.issues,
            });
            return;
        }
        const payload = parsed.data;
        const userDetails: User = (req as any).user;
        const deviceDetails: Device | undefined = (req as any).device;

        if (!deviceDetails) {
            res.sendStatus(401);
            return;
        }

        if (!payload.file) {
            console.warn("MISSING FILE");
            res.sendStatus(400);
            return;
        }

        const buf = Buffer.from(XUtils.decodeBase64(payload.file));
        const mimeType = await fileTypeFromBuffer(buf);
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType?.mime || "no/type")) {
            res.status(400).send({
                error:
                    "Unsupported file type. Expected jpeg, png, gif, apng, avif, or svg but received " +
                    mimeType?.ext,
            });
            return;
        }

        try {
            // write the file to disk
            fs.writeFile("avatars/" + userDetails.userID, buf, () => {
                log.info("Wrote new avatar " + userDetails.userID);
            });
            res.sendStatus(200);
        } catch (err: unknown) {
            log.warn(String(err));
            res.sendStatus(500);
        }
    });

    router.post(
        "/:userID",
        protect,
        multer().single("avatar"),
        async (req, res) => {
            const userDetails: User = (req as any).user;
            const deviceDetails: Device | undefined = (req as any).device;

            if (!deviceDetails) {
                res.sendStatus(401);
                return;
            }

            if (!req.file) {
                console.warn("MISSING FILE");
                res.sendStatus(400);
                return;
            }

            const mimeType = await fileTypeFromBuffer(req.file.buffer);
            if (!ALLOWED_IMAGE_TYPES.includes(mimeType?.mime || "no/type")) {
                res.status(400).send({
                    error:
                        "Unsupported file type. Expected jpeg, png, gif, apng, avif, or svg but received " +
                        mimeType?.ext,
                });
                return;
            }

            try {
                // write the file to disk
                fs.writeFile(
                    "avatars/" + userDetails.userID,
                    req.file.buffer,
                    () => {
                        log.info("Wrote new avatar " + userDetails.userID);
                    },
                );
                res.sendStatus(200);
            } catch (err: unknown) {
                log.warn(String(err));
                res.sendStatus(500);
            }
        },
    );

    return router;
};
