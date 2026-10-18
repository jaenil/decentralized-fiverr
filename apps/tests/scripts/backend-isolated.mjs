import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "df-tests-"));
const data = join(directory, "pg");
const pg = (command) =>
  process.env.PG_BIN ? join(process.env.PG_BIN, command) : command;
// Only loopback is used. A port collision fails startup rather than using another database.
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const env = {
  ...process.env,
  DF_ISOLATED_TEST: "1",
  DATABASE_URL: `postgresql://df_test@127.0.0.1:${port}/postgres`,
  JWT_SECRET: randomBytes(32).toString("hex"),
  WORKER_JWT_SECRET: randomBytes(32).toString("hex"),
  AWS_ACCESS_KEY_ID: "isolated-test-key",
  AWS_SECRET_ACCESS_KEY: "isolated-test-secret",
  AWS_REGION: "ap-south-1",
  AWS_EC2_METADATA_DISABLED: "true",
};
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} exited ${result.status}`);
}
let started = false;
try {
  run(pg("initdb"), [
    "-D",
    data,
    "-A",
    "trust",
    "-U",
    "df_test",
    "--no-locale",
    "-E",
    "UTF8",
  ]);
  run(pg("pg_ctl"), [
    "-D",
    data,
    "-l",
    join(directory, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port} -k ${directory}`,
    "-w",
    "start",
  ]);
  started = true;
  run(
    resolve(root, "node_modules/.bin/prisma"),
    ["db", "init"],
    resolve(root, "apps/backend"),
  );
  run(
    resolve(root, "node_modules/.bin/vitest"),
    ["run", "--config", "backend/isolated.config.ts", ...process.argv.slice(2)],
    resolve(root, "apps/tests"),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (started) {
    const stopped = spawnSync(
      pg("pg_ctl"),
      ["-D", data, "-m", "immediate", "-w", "stop"],
      { stdio: "inherit" },
    );
    if (stopped.status !== 0) {
      console.error(`PostgreSQL cleanup failed; inspect ${directory}`);
      process.exitCode = 1;
    } else rmSync(directory, { recursive: true, force: true });
  } else rmSync(directory, { recursive: true, force: true });
}
