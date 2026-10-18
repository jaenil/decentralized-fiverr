// Keep the ESLint parser on this app's supported TS compiler, even when npm hoists it.
import { createRequire, registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const compiler = pathToFileURL(require.resolve("typescript")).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "typescript")
      return { url: compiler, format: "commonjs", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const cli = join(
  dirname(require.resolve("eslint/package.json")),
  "bin/eslint.js",
);
process.argv = [process.execPath, cli, ".", "--max-warnings", "0"];
await import(pathToFileURL(cli).href);
