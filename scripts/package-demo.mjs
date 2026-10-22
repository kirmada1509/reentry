import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { root } from "./project.mjs";
const directory = path.join(root, ".runtime/release");
const captions = JSON.parse(
  readFileSync(path.join(directory, "captions.json"), "utf8"),
);
function time(seconds, separator = ",") {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
writeFileSync(
  path.join(directory, "reentry-demo.srt"),
  captions
    .map(
      (c, index) =>
        `${index + 1}\n${time(c.start)} --> ${time(c.end)}\n${c.text}\n`,
    )
    .join("\n"),
);
writeFileSync(
  path.join(directory, "reentry-demo.vtt"),
  "WEBVTT\n\n" +
    captions
      .map((c) => `${time(c.start, ".")} --> ${time(c.end, ".")}\n${c.text}\n`)
      .join("\n"),
);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-i",
    path.join(directory, "reentry-demo.webm"),
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
    path.join(directory, "reentry-demo.mp4"),
  ],
  { stdio: "inherit" },
);
console.log(
  "Packaged browser recording as MP4 with SRT/VTT captions in .runtime/release.",
);
