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
export const sourceSnapshotSchema = captureSchema.extend({
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export const taskSchema = z.strictObject({
  id: idSchema,
  captureId: idSchema,
  goal: z.string(),
  workUrl: httpUrlSchema,
  progress: z.string(),
  nextAction: z.string(),
  materialUrls: z.array(httpUrlSchema),
  savedAt: z.iso.datetime(),
  revision: z.number().int().positive(),
  source: sourceSnapshotSchema,
});
export type SavedTask = z.infer<typeof taskSchema>;

export const draftSchema = z.strictObject({
  id: idSchema,
  baseRevision: z.number().int().nonnegative(),
  capturedAt: z.iso.datetime().optional(),
  goal: z.string().max(300),
  workUrl: z.string().max(2048),
  progress: z.string().max(3000),
  nextAction: z.string().max(1000),
  materials: z.string().max(10300),
  confirmed: z.boolean(),
});
export type TaskDraft = z.infer<typeof draftSchema>;
export type TaskRevision = {
  taskId: string;
  revision: number;
  task: SavedTask;
};
export type DeletionMarker = { id: string; deletedAt: string };
export type Cleanup = {
  id: string;
  taskIds: string[];
  captureIds: string[];
  before?: string;
};
