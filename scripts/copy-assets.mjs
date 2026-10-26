import { cpSync, readdirSync } from "node:fs";
import { join } from "node:path";

const source = "src/nodes";
const target = "dist/nodes";

for (const file of readdirSync(source).filter(name => name.endsWith(".html"))) {
	cpSync(join(source, file), join(target, file));
}
