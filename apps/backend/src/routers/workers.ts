import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db";
import { createSubmissionInput } from "../types";
import { workerMiddleware } from "../middleware/workerMiddleware";
import { getNextTask } from "../db";
import { LAMPORTS_PER_SOL } from "../config";

const router = Router();

router.post("/signup", async (req, res) => {

    //TODO: add sign verification logic here 
    const address = req.body.walletId || req.body.address;

    const worker = await db.orm.public.Worker.upsert({
        create: {
            address: address,
        },
        update: {
        },
        conflictOn: {
            address: address,
        },
    })

    const token = jwt.sign(
        { id: worker?.id },
        process.env.WORKER_JWT_SECRET || 'your-secret-key-change-in-prod',
        { expiresIn: '7d' }
    );

    res.json({ token });
})
//get(nextTask)
router.get("/nextTask", workerMiddleware, async (req, res) => {
    const workerId = req.body.workerId
    const task = await getNextTask(workerId);
    if (!task) {
        return res.status(404).json({ message: "No more tasks left for you" });
    }
    res.status(200).json({
        task
    });
})

//post(submission)
router.post("/submission", workerMiddleware, async (req, res) => {
    const parsedData = createSubmissionInput.safeParse(req.body)
    if (!parsedData.success) {
        return res.status(411).json({ message: "invalid input", "err:": parsedData.error });
    }
    const workerId = req.body.workerId;
    try {
        const result = await db.transaction(async (tx) => {
            const submission = await tx.orm.public.Submission.create({
                worker_id: workerId,
                task_id: parsedData.data.taskId,
                option_id: parsedData.data.optionId,
            })
            //TODO:hardcoded an amount of 1 dollar for now need to logic for dynamically adding the3 amoutn for each user
            const worker = await tx.orm.public.Worker.where({ id: workerId }).first();
            if (!worker) {
                throw new Error("Worker not found");
            }
            // 3. Update pending_amount (using tx)
            const amount = BigInt(Math.floor(0.01 * LAMPORTS_PER_SOL));
            await tx.orm.public.Worker
                .where({ id: workerId })
                .update({ pending_amount: worker.pending_amount + amount });
            const nextTask = await getNextTask(workerId);
            return {
                submissionId: submission.id,
                nextTask: nextTask
            };
        });

        return res.status(200).json(result);
    } catch (e: any) {
        console.log(`transaction rolled back,error:${e}`);
        if (e?.message === "Worker not found") {
            return res.status(404).json({ message: "Worker not found" });
        }
        return res.status(500).json({ message: "Failed to submit task" });
    }
})
//get(balance)
router.get("/balance", workerMiddleware, async (req, res) => {
    const workerId = req.body.workerId;
    const worker = await db.orm.public.Worker.where({ id: workerId }).first();
    if (!worker) {
        return res.status(404).json("Did not find requested worker")
    }
    res.status(200).json({
        pendingAmount: worker.pending_amount,
        lockedAmount: worker.locked_amount,
    })
})
//post(payout)
router.post("/payout", workerMiddleware, async (req, res) => {
    //steps
    //inside a transaction first reduce pending_amount and increase locked amount ,create payout and set status to pending 
    //then send the actual transaction through the solana blockchain
    //update status to completed if transaction successful else failed 
    //signature must
    const workerId = req.body.workerId;
    //TODO: hardcoded txn id here for now need to dynamically add it later 
    const txn_id = "abkdkdkd";
    try {
        const payout = await db.transaction(async (tx) => {
            const worker = await tx.orm.public.Worker.where({ id: workerId }).first();
            if (!worker) {
                throw new Error("Worker not found");
            }
            const address = worker.address;
            const pending_amount = worker.pending_amount;
            const locked_amount = worker.locked_amount;
            
            await tx.orm.public.Worker
                .where({ id: workerId })
                .update({ pending_amount: BigInt(0), locked_amount: locked_amount + pending_amount });     
            const createdPayout = await tx.orm.public.Payouts.create({
                worker_id: workerId,
                amount: pending_amount,
                status: "PENDING",
                signature: txn_id
            });  
            //TODO: implement the actual solana transaction logic here 
            return createdPayout;
        });

        return res.status(200).json({
            message: "Payout initiated",
            amount: payout.amount.toString(),
            signature: txn_id
        });
    } catch (e: any) {
        console.log(e);
        if (e?.message === "Worker not found") {
            return res.status(404).json({ message: "Did not find requested worker" });
        }
        await db.orm.public.Payouts.create({
            worker_id: workerId,
            status: "FAILED",
            amount: BigInt(Math.floor(0.01 * LAMPORTS_PER_SOL)),
            signature: txn_id
        });
        return res.status(500).json({ message: "Transaction failed" });
    }
})
export default router;