import { describe, it, expect } from "vitest";
import axios from "axios";
import { Client } from "pg";
import { signupUser, signupWorker } from "./helpers/auth";

// Fault injection is restricted to the disposable database runner.
describe.skipIf(process.env.DF_ISOLATED_TEST !== "1")(
  "Payout database failure recovery",
  () => {
    it("rolls back locked funds when payout creation fails, then permits a retry", async () => {
      const api = process.env.API_URL!;
      const http = axios.create({ validateStatus: () => true });
      const user = await signupUser();
      const worker = await signupWorker();
      const userHeaders = { Authorization: `Bearer ${user.token}` };
      const workerHeaders = { Authorization: `Bearer ${worker.token}` };
      const task = await http.post(
        `${api}/users/task`,
        {
          signature: "recovery-fixture",
          options: [
            { imageUrl: "https://example.com/a.jpg" },
            { imageUrl: "https://example.com/b.jpg" },
          ],
        },
        { headers: userHeaders },
      );
      expect(task.status).toBe(200);
      const detail = await http.get(`${api}/users/task`, {
        params: { taskId: task.data.id },
        headers: userHeaders,
      });
      expect(detail.status).toBe(200);
      const vote = await http.post(
        `${api}/workers/submission`,
        {
          taskId: task.data.id,
          optionId: detail.data.options[0].id,
        },
        { headers: workerHeaders },
      );
      expect(vote.status).toBe(200);

      const db = new Client({ connectionString: process.env.DATABASE_URL });
      await db.connect();
      try {
        // No production code is mocked: a real PostgreSQL failure exercises rollback.
        await db.query(`CREATE FUNCTION test_reject_pending_payout() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.status::text = 'PENDING' THEN RAISE EXCEPTION 'injected payout persistence failure'; END IF;
          RETURN NEW;
        END $$`);
        await db.query(`CREATE TRIGGER test_reject_pending_payout BEFORE INSERT ON "Payouts"
        FOR EACH ROW EXECUTE FUNCTION test_reject_pending_payout()`);
        const failed = await http.post(
          `${api}/workers/payout`,
          {},
          { headers: workerHeaders },
        );
        expect(failed.status).toBe(500);
        const balance = await http.get(`${api}/workers/balance`, {
          headers: workerHeaders,
        });
        expect(balance.data).toEqual({
          pendingAmount: "10000000",
          lockedAmount: "0",
        });
        const records = await db.query(
          `SELECT p.status FROM "Payouts" p JOIN "Worker" w ON p.worker_id = w.id WHERE w.address = $1`,
          [worker.walletId],
        );
        expect(records.rows).toEqual([{ status: "FAILED" }]);
        await db.query('DROP TRIGGER test_reject_pending_payout ON "Payouts"');
        const retry = await http.post(
          `${api}/workers/payout`,
          {},
          { headers: workerHeaders },
        );
        expect(retry.status).toBe(200);
        expect(retry.data.amount).toBe("10000000");
        const after = await http.get(`${api}/workers/balance`, {
          headers: workerHeaders,
        });
        expect(after.data).toEqual({
          pendingAmount: "0",
          lockedAmount: "10000000",
        });
      } finally {
        await db.query(
          'DROP TRIGGER IF EXISTS test_reject_pending_payout ON "Payouts"',
        );
        await db.query("DROP FUNCTION IF EXISTS test_reject_pending_payout()");
        await db.end();
      }
    });
  },
);
