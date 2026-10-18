import z from "zod";

export const createTaskInput = z.object({
    options: z.array(z.object({
        imageUrl: z.string()
    })).min(2),
    title: z.string().optional(),
    signature: z.string(),
    maxSubmissions: z.coerce.number().int().positive().optional(),
    totalBudget: z.coerce.number().positive().optional(),
});

export const createSubmissionInput = z.object({
    taskId: z.coerce.number(),
    optionId: z.coerce.number(),
});

export const getTaskSubmissions = z.object({
    taskId:z.coerce.number()
})
 