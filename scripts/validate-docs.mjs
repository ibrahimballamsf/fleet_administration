import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

/**
 *  This validates local links in Markdown documentation files within the repository.
 *  It ensures that all local links point to existing files within the repository.
 */
const repositoryRoot = resolve(import.meta.dirname, "..");
const roots = [resolve(repositoryRoot, "README.md"), resolve(repositoryRoot, "docs"), resolve(repositoryRoot, "scripts", "README.md")];

function markdownFiles(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return extname(path) === ".md" ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    markdownFiles(resolve(path, entry.name))
  );
}

const errors = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of roots.flatMap(markdownFiles)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const destination = match[1].trim().replace(/^<|>$/g, "");
    if (!destination || destination.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(destination)) continue;

    const relativePath = destination.split("#", 1)[0];
    const target = resolve(dirname(file), decodeURIComponent(relativePath));
    if (!existsSync(target)) {
      const line = source.slice(0, match.index).split("\n").length;
      errors.push(`${file.slice(repositoryRoot.length + 1)}:${line} -> ${destination}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation contains ${errors.length} broken local link(s):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Documentation links are valid.");
}
