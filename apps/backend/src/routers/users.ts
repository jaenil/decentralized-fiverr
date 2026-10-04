import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { userMiddleware } from "../middleware/userMiddleware";
import { createTaskInput, getTaskSubmissions } from "../types";
import { LAMPORTS_PER_SOL } from "../config";

const router = Router();
const client = new S3Client({
    credentials: {
        "accessKeyId": process.env.AWS_ACCESS_KEY_ID || "",
        "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    region: process.env.AWS_REGION || "ap-south-1"
});

//signin with a wallet
//must sign a message for the purpose
router.post("/signup", async (req, res) => {

    const name = req.body.name;
    //TODO: add sign verification logic here 
    const address = req.body.walletId || req.body.address;
    if (!address) {
        return res.status(400).json({ message: "walletId / address is required" });
    }
    const user = await db.orm.public.User.upsert({
        create: {
            name: name,
            address: address,
        },
        update: {
            name: name,
        },
        conflictOn: {
            address: address,
        },
    })

    const token = jwt.sign(
        { id: user?.id },
        process.env.JWT_SECRET || 'your-secret-key-change-in-prod',
        { expiresIn: '7d' }
    );

    res.json({ token });
})

router.get("/preSignedUrl", userMiddleware, async (req, res) => {

    const command = new PutObjectCommand({
        Bucket: "decentralized-fiverr-jp",
        Key: `${req.body.userId}/${Date.now()}/image.jpg`,
    });
    try {
        // URL expires in 1 hour (3600 seconds)
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });
        return res.status(200).json({ url });
    } catch (e) {
        return res.status(500).json({ message: "Failed to generate pre-signed URL" });
    }
})

//creating a task
//for now assume amount = 1  signature verificationlogic from signature later 
router.post("/task", userMiddleware, async (req, res) => {
    const parsedData = createTaskInput.safeParse(req.body)
    if (!parsedData.success) {
        return res.status(411).json({ message: "invalid input", "err:": parsedData.error });
    }
    //create a transction with two things firstly create the task and then create the options
    try {
        const task = await db.transaction(async (tx) => {
            const newTask = await tx.orm.public.Task.create({
                user_id: req.body.userId,
                title: parsedData.data.title ?? "Select the most clickable thumbnail",
                signature: parsedData.data.signature,
                amount: BigInt(1 * LAMPORTS_PER_SOL),
            });
            //now need to go through the entire options array and create new options
            const options = parsedData.data.options;
            await Promise.all(
                options.map((opt) => 
                    tx.orm.public.Option.create({
                        task_id: newTask.id,
                        image_url: opt.imageUrl,
                    })
                )
            );
            return newTask;
        });

        return res.status(200).json({ "id": task.id });
    } catch (e) {
        console.log(`transaction rolled back,error:${e}`);
        return res.status(500).json({ message: "Failed to create task" });
    }
})

router.get("/task", userMiddleware, async (req, res) => {
    const parsedData = getTaskSubmissions.safeParse(req.query);
    if (!parsedData.success) {
        return res.status(411).json({ message: "invalid input", "err:": parsedData.error });
    }

    const user_id = req.body.userId;
    //need task_id
    const taskId = parsedData.data.taskId;

    const task = await db.orm.public.Task.where({ id: taskId }).first();
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    if (task?.user_id !== user_id) {
        return res.status(403).json({ message: "Unauthorized" })
    }
    const options = await db.orm.public.Option.where({ task_id: taskId }).include("submissions").all();
    //TODO: need to change this so that I can get the count of each option (hint: use submissions )
    res.status(200).json({
        taskId,
        options
    });
})

export default router;