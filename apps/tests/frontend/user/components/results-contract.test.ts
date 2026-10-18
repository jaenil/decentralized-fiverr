import { expect, it } from "vitest";
import { apiClient, getTaskResults } from "@/lib/api";
it("derives vote counts from the actual raw submissions response", async () => {
  const original = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => ({
    status: 200,
    statusText: "OK",
    headers: {},
    config,
    data: {
      taskId: 7,
      options: [
        {
          id: 1,
          task_id: 7,
          image_url: "",
          submissions: [{ id: 1 }, { id: 2 }],
        },
      ],
    },
  });
  try {
    const data = await getTaskResults(7);
    expect(data.options[0].submissionCount).toBe(2);
  } finally {
    apiClient.defaults.adapter = original;
  }
});
