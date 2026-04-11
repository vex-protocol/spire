/**
 * Workaround: `@scalar/express-api-reference@0.9.7` ships a
 * `package.json` whose `readme` field is a structured object instead
 * of a string. The `license-checker@25.0.1` (and all earlier versions)
 * that `@onebeyond/license-checker scan` wraps crashes at
 * `lib/index.js:114` with `json.readme.toLowerCase is not a function`
 * when it tries to detect "no readme data found".
 *
 * Strip the malformed field in-place before invoking the checker.
 * Runs every time via the `license:check` npm script so a fresh
 * `npm ci` in CI also gets the fix.
 *
 * Long-term fix should come from @scalar (open an issue / PR) or
 * from a `license-checker` release with a typeof guard. When either
 * lands, delete this script and the preceding `&&` in the
 * `license:check` script.
 */
import fs from "node:fs";

const pkgPath = "node_modules/@scalar/express-api-reference/package.json";

if (!fs.existsSync(pkgPath)) {
    // Not installed (e.g. `npm ci --omit=dev` on a prod install)
    process.exit(0);
}

const raw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);

if (pkg.readme !== undefined && typeof pkg.readme !== "string") {
    delete pkg.readme;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(
        "fix-license-checker: stripped non-string readme field from @scalar/express-api-reference",
    );
}
