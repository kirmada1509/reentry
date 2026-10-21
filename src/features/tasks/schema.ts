import { z } from "zod";
import { captureSchema, httpUrlSchema, idSchema } from "../capture/protocol";

export const taskInputSchema = z.strictObject({
  goal: z.string().trim().min(1, "Add your goal.").max(300),
  workUrl: httpUrlSchema,
  progress: z
    .string()
    .trim()
    .min(1, "Describe your confirmed progress, or write Nothing yet.")
    .max(3000),
  nextAction: z.string().trim().min(1, "Add one next action.").max(1000),
  materialUrls: z.array(httpUrlSchema).max(5),
  confirmed: z.literal(true, {
    error: "Confirm that the progress is your own record.",
  }),
});
export type TaskInput = z.infer<typeof taskInputSchema>;
export const taskSchema = z.strictObject({
  id: idSchema,
  captureId: idSchema,
  goal: z.string(),
  workUrl: httpUrlSchema,
  progress: z.string(),
  nextAction: z.string(),
  materialUrls: z.array(httpUrlSchema),
  savedAt: z.iso.datetime(),
  revision: z.literal(1),
  source: captureSchema.extend({ digest: z.string().regex(/^[a-f0-9]{64}$/) }),
});
export type SavedTask = z.infer<typeof taskSchema>;
