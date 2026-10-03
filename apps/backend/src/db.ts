import { db } from "./prisma/db";
export type TaskWithOptions = {
    id: number;
    amount: bigint;
    done: boolean;
    signature: string;
    title: string;
    user_id: number;
    options: {
        id: number;
        image_url: string;
        task_id: number;
    }[];
} | null;
export  const getNextTask=async(workerId:number):Promise<TaskWithOptions>=>{
    const task = await db.orm.public.Task
            .where({ done: false })
            .where((t) => t.submissions.none((s) => s.worker_id.eq(workerId)))
            .include("options")
            .first();
    return task;
}