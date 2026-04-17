import { rmSync } from "node:fs";

rmSync("dist/__tests__", { force: true, recursive: true });
