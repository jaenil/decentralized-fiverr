import express from "express";
import type { TestProject } from "vitest/node";
import type { AddressInfo } from "node:net";

export default async function setup(project: TestProject) {
  if (process.env.DF_ISOLATED_TEST !== "1") {
    throw new Error(
      "Use npm run test:backend:isolated -w tests to provision a disposable database.",
    );
  }
  const { default: users } = await import("../../backend/src/routers/users");
  const { default: workers } =
    await import("../../backend/src/routers/workers");
  const { db } = await import("../../backend/src/prisma/db");
  const app = express();
  app.use(express.json());
  app.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  app.use("/v1/users", users);
  app.use("/v1/workers", workers);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  project.provide(
    "apiUrl",
    `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
  );
  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    await db.close();
  };
}
