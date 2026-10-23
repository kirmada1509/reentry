import { z } from "zod";
const recording = z.object({
  complete: z.literal(true),
  realProvider: z.literal("nvidia"),
  scriptedClock: z.literal(false),
  kind: z.enum(["application", "shopping"]),
  endedAt: z.number().finite().positive(),
  captions: z
    .array(
      z.strictObject({
        start: z.number().finite(),
        end: z.number().finite(),
        text: z.string().min(1).max(600),
      }),
    )
    .min(1),
});
export function recordingCaptions(input: unknown, duration: number) {
  const value = recording.parse(input);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
    throw new Error("Invalid recording duration.");
  const beganAt = value.endedAt - duration * 1000;
  let previous = -Infinity;
  const captions = value.captions.map((c) => {
    if (c.end <= c.start || c.start < previous)
      throw new Error("Caption intervals must be positive and ordered.");
    previous = c.end;
    const start = Math.max(0, (c.start - beganAt) / 1000),
      end = Math.min(duration, (c.end - beganAt) / 1000);
    if (start >= end) throw new Error("Caption is outside this recording.");
    return { start, end, text: c.text };
  });
  return { kind: value.kind, captions };
}
export function subtitleTime(seconds: number, separator = ",") {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
