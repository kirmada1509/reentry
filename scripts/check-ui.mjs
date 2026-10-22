import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { root, filesUnder } from "./project.mjs";

export const hash = (content) =>
  createHash("sha256").update(content).digest("hex");
const layoutTags = new Set([
  "html",
  "body",
  "main",
  "form",
  "div",
  "section",
  "header",
  "footer",
  "nav",
  "h1",
  "h2",
  "h3",
  "p",
  "span",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "article",
  "aside",
  "code",
  "pre",
]);
const layoutClass =
  /^(?:(?:sm|md|lg|xl):)?(?:container|min-w-0|wrap-anywhere|flex|grid|block|hidden|flex-col|flex-wrap|grow|shrink-0|w-full|h-full|min-h-screen|mx-auto|items-(?:start|center|end)|justify-(?:start|center|between|end)|gap-\d+|grid-cols-\d+|col-span-\d+|max-w-(?:sm|md|lg|xl|[2-7]xl)|[pm][xytrbl]?-\d+)$/;
const frameworkEntry =
  /(?:^|\/)(?:page|layout|loading|error|global-error|not-found|template|default)\.[jt]sx?$|^extension\/entrypoints\/[^/]+\/main\.tsx$|^sandboxes\/[^/]+\/main\.tsx$/;

export function checkUi(directory = root) {
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "docs/ui-provenance.json"), "utf8"),
  );
  const issues = [];
  for (const [name, digest] of Object.entries(manifest.files)) {
    try {
      if (hash(readFileSync(path.join(directory, name))) !== digest)
        issues.push(
          name + ": registry file changed; reinstall via pnpm ui:add",
        );
    } catch {
      issues.push(name + ": registered file is missing");
    }
  }
  const sources = [
    "src",
    "extension/entrypoints",
    "extension/lib",
    "sandboxes",
  ].flatMap((entry) => filesUnder(path.join(directory, entry)));
  for (const file of sources) {
    const name = path.relative(directory, file).split(path.sep).join("/");
    if (manifest.files[name]) continue;
    // Extension builds also need the shared, registry-owned component sources
    // outside their Vite root. No visual rules are authored in this entry.
    if (
      name === "extension/entrypoints/entry.css" &&
      readFileSync(file, "utf8").trim() ===
        '@import "../../src/app/globals.css";\n@source "../../src/components";'
    )
      continue;
    // The standalone portal needs to scan registry components outside its Vite
    // root. This entry only wires sources; all visual rules remain upstream.
    if (
      name === "sandboxes/scholarship/entry.css" &&
      readFileSync(file, "utf8").trim() ===
        '@import "../../src/app/globals.css";\n@source "../../src/components/ui";'
    )
      continue;
    if (
      name.startsWith("src/components/") ||
      /\.(?:css|scss|sass|less)$/.test(name)
    ) {
      issues.push(name + ": UI assets must be installed through the registry");
      continue;
    }
    if (!/\.[jt]sx?$/.test(name)) continue;
    const source = readFileSync(file, "utf8");
    const tree = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (
        ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node)
      ) {
        if (!frameworkEntry.test(name)) {
          issues.push(
            name +
              ": compose UI in framework entries; install reusable components from the registry",
          );
          return;
        }
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(tree);
        if (/^[a-z]/.test(tag) && !layoutTags.has(tag))
          issues.push(
            name + ": use a registry component instead of <" + tag + ">",
          );
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute)) continue;
          const key = attribute.name.getText(tree);
          if (key === "style" || key === "dangerouslySetInnerHTML")
            issues.push(name + ": custom styles/HTML are disabled");
          if (key === "className" && name !== "src/app/layout.tsx") {
            const value = attribute.initializer;
            if (
              !value ||
              !ts.isStringLiteral(value) ||
              value.text
                .split(/\s+/)
                .some((token) => token && !layoutClass.test(token))
            ) {
              issues.push(
                name +
                  ": only static layout utilities are allowed; use registry variants for appearance",
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  return [...new Set(issues)];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const issues = checkUi();
  if (issues.length) {
    console.error(issues.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "UI policy passed: registry assets intact; no custom visual components found.",
    );
}
