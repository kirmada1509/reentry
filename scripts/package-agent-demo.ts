import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { recordingCaptions, subtitleTime } from "./lib/recording";
const requested = process.argv[2];
if (!requested)
  throw new Error(
    "Supply a completed browser recording directory and optional fresh publication directory.",
  );
const input = path.resolve(requested),
  out = path.resolve(process.argv[3] ?? path.join(input, "publish"));
const run = JSON.parse(readFileSync(path.join(input, "run.json"), "utf8"));
const restart = JSON.parse(
  readFileSync(path.join(input, "restart.json"), "utf8"),
);
if (run.complete !== true || run.status !== 0 || restart.passed !== true)
  throw new Error(
    "Only a completed recording with a passing restart check can be packaged.",
  );
function probe(file: string) {
  return JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=width,height,codec_name",
        "-of",
        "json",
        file,
      ],
      { encoding: "utf8" },
    ),
  );
}
const source = path.join(input, "journey.webm"),
  original = probe(source),
  duration = Number(original.format.duration);
const value = recordingCaptions(
  JSON.parse(readFileSync(path.join(input, "journey.json"), "utf8")),
  duration,
);
mkdirSync(out); // Never overwrite a prior publication package.
const stem = `reentry-agent-${value.kind}`;
function wrap(text: string) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || lines.at(-1)!.length + word.length + 1 > 68)
      lines.push(word);
    else lines[lines.length - 1] += " " + word;
  }
  return lines.join("\n");
}
writeFileSync(
  path.join(out, `${stem}.srt`),
  value.captions
    .map(
      (c, i) =>
        `${i + 1}\n${subtitleTime(c.start)} --> ${subtitleTime(c.end)}\n${wrap(c.text)}\n`,
    )
    .join("\n"),
);
writeFileSync(
  path.join(out, `${stem}.vtt`),
  "WEBVTT\n\n" +
    value.captions
      .map(
        (c) =>
          `${subtitleTime(c.start, ".")} --> ${subtitleTime(c.end, ".")}\n${wrap(c.text)}\n`,
      )
      .join("\n"),
);
const target = path.join(out, `${stem}.mp4`);
execFileSync(
  "ffmpeg",
  [
    "-n",
    "-loglevel",
    "error",
    "-i",
    source,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    target,
  ],
  { stdio: "inherit" },
);
const encoded = probe(target),
  encodedDuration = Number(encoded.format.duration);
if (Math.abs(duration - encodedDuration) > 0.3)
  throw new Error("Transcode unexpectedly changed the recording duration.");
const report = {
  kind: value.kind,
  durationSeconds: encodedDuration,
  width: encoded.streams[0]?.width,
  height: encoded.streams[0]?.height,
  underThreeMinutes: encodedDuration < 180,
  uninterrupted: true,
  cuts: 0,
  speedChanges: 0,
  audio: "Browser recording has no audio; separate SRT/VTT captions supplied.",
  sourceSha256: createHash("sha256").update(readFileSync(source)).digest("hex"),
  mp4Sha256: createHash("sha256").update(readFileSync(target)).digest("hex"),
  captionCount: value.captions.length,
};
writeFileSync(
  path.join(out, "media.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
