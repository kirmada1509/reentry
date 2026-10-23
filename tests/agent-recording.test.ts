import { expect, it } from "vitest";
import { recordingCaptions } from "../scripts/lib/recording";
const input = {
  complete: true,
  realProvider: "nvidia",
  scriptedClock: false,
  kind: "application",
  endedAt: 100000,
  captions: [
    { start: 90000, end: 95000, text: "A real browser state" },
    { start: 95000, end: 100000, text: "The matching receipt" },
  ],
};
it("aligns wall-clock caption spans to the uncut video and keeps every interval inside it", () => {
  const result = recordingCaptions(input, 12);
  expect(result.captions.map((c) => [c.start, c.end])).toEqual([
    [2, 7],
    [7, 12],
  ]);
  expect(recordingCaptions(input, 8).captions[0]).toMatchObject({
    start: 0,
    end: 3,
  });
});
it("refuses failed, accelerated, mismatched and unordered recording evidence", () => {
  for (const extra of [
    { complete: false },
    { scriptedClock: true },
    { realProvider: "fixture" },
    { captions: [input.captions[1], input.captions[0]] },
  ])
    expect(() => recordingCaptions({ ...input, ...extra }, 12)).toThrow();
  expect(() => recordingCaptions(input, 0)).toThrow();
  expect(() => recordingCaptions(input, 1)).toThrow();
});
