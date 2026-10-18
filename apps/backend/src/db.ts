import { db } from "./prisma/db";

export type TaskWithOptions = {
    id: number;
    amount: bigint;
    reward_per_vote: bigint;
    max_submissions: number;
    submission_count: number;
    done: boolean;
    status: "ACTIVE" | "COMPLETED" | "EXHAUSTED";
    signature: string;
    title: string;
    user_id: number;
    options: {
        id: number;
        image_url: string;
        task_id: number;
    }[];
} | null;

export const getNextTask = async (workerId: number): Promise<TaskWithOptions> => {
    const tasks = await db.orm.public.Task
        .where({ done: false, status: "ACTIVE" })
        .where((t) => t.submissions.none((s) => s.worker_id.eq(workerId)))
        .include("options")
        .all();

    for (const task of tasks) {
        if (task.submission_count >= task.max_submissions) {
            await db.orm.public.Task
                .where({ id: task.id })
                .update({ done: true, status: "COMPLETED" });
            continue;
        }

        return task;
    }

    return null;
};