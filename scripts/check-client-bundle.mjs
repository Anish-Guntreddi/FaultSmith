import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const clientDirectory = path.resolve(".next/static");
const forbiddenMarkers = [
  "hiddenRootCause",
  "hiddenReferenceSolution",
  "expectedFailureSignature",
  "OPENAI_API_KEY",
  "inclusive >= comparison",
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(target) : [target];
    }),
  );
  return nested.flat();
}

const files = (await collectFiles(clientDirectory)).filter((file) => /\.(?:js|css|html|json)$/.test(file));
const findings = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) findings.push(`${path.relative(process.cwd(), file)} contains ${marker}`);
  }
}

if (findings.length > 0) {
  console.error("Client bundle leakage check failed:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Client bundle leakage check passed (${files.length} artifacts inspected).`);
}
