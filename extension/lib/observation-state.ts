import { storage } from "wxt/utils/storage";
import { z } from "zod";
import {
  eventSchema,
  sessionSchema,
} from "../../src/features/observation/protocol";

export const agentStateSchema = z.strictObject({
  pairing: z
    .strictObject({
      deviceId: z.uuid(),
      token: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .nullable(),
  challenge: z
    .strictObject({
      value: z.string().regex(/^[a-f0-9]{64}$/),
      until: z.number(),
    })
    .nullable(),
  session: sessionSchema.nullable(),
  halted: z.boolean(),
  queue: z.array(eventSchema).max(100),
  dropped: z.number().int().min(0),
  lastDelivered: z.iso.datetime().nullable(),
  problem: z.enum([
    "none",
    "offline",
    "revoked",
    "storage",
    "capacity",
    "permission",
    "reader",
  ]),
});
export type AgentState = z.infer<typeof agentStateSchema>;
const initial: AgentState = {
  pairing: null,
  challenge: null,
  session: null,
  halted: true,
  queue: [],
  dropped: 0,
  lastDelivered: null,
  problem: "none",
};
const state = storage.defineItem<AgentState>("local:observation-v1", {
  fallback: initial,
});
let writes: Promise<unknown> = Promise.resolve();
export function updateAgent<T>(
  change: (state: AgentState) => { state: AgentState; result: T },
): Promise<T> {
  const next = writes
    .catch(() => undefined)
    .then(async () => {
      const before = agentStateSchema.parse(await state.getValue());
      const changed = change(before);
      const valid = agentStateSchema.parse(changed.state);
      if (JSON.stringify(before) !== JSON.stringify(valid))
        await state.setValue(valid);
      return changed.result;
    });
  writes = next;
  return next;
}
export const readAgent = () =>
  updateAgent((state) => ({ state, result: state }));
