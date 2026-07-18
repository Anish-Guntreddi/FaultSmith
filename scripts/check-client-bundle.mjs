import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultClientDirectory = path.join(repositoryRoot, ".next/static");
const defaultFixtureSource = path.join(repositoryRoot, "src/server/fixtures.ts");

const staticForbiddenMarkers = [
  { id: "internal-field:hidden-root", value: "hiddenRootCause" },
  { id: "internal-field:hidden-reference", value: "hiddenReferenceSolution" },
  { id: "internal-field:failure-signature", value: "expectedFailureSignature" },
  { id: "internal-field:mutation-patch", value: "mutationPatch" },
  { id: "internal-field:broken-snippet", value: "brokenSnippet" },
  { id: "internal-field:fixed-snippet", value: "fixedSnippet" },
  { id: "environment:openai-key", value: "OPENAI_API_KEY" },
];

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function unwrap(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectProperty(object, name, fixtureId) {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && propertyName(property.name) === name) {
      return property.initializer;
    }
  }
  throw new Error(`Fixture ${fixtureId} is missing required hidden marker field ${name}.`);
}

function createStaticEvaluator(sourceFile) {
  const bindings = new Map();
  const resolving = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        bindings.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  function evaluateString(node, context) {
    const current = unwrap(node);
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      return current.text;
    }
    if (ts.isIdentifier(current)) {
      if (resolving.has(current.text)) {
        throw new Error(`Fixture ${context} contains a cyclic static binding.`);
      }
      const initializer = bindings.get(current.text);
      if (!initializer) {
        throw new Error(`Fixture ${context} uses an unsupported static binding.`);
      }
      resolving.add(current.text);
      try {
        return evaluateString(initializer, context);
      } finally {
        resolving.delete(current.text);
      }
    }
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return evaluateString(current.left, context) + evaluateString(current.right, context);
    }
    if (ts.isTemplateExpression(current)) {
      let value = current.head.text;
      for (const span of current.templateSpans) {
        value += evaluateString(span.expression, context) + span.literal.text;
      }
      return value;
    }
    if (ts.isCallExpression(current)) {
      if (ts.isIdentifier(current.expression) && current.expression.text === "lines") {
        return `${evaluateStringArray(current.arguments[0], context).join("\n")}\n`;
      }
      if (
        ts.isPropertyAccessExpression(current.expression) &&
        current.expression.name.text === "replace" &&
        current.arguments.length === 2
      ) {
        const input = evaluateString(current.expression.expression, context);
        const search = evaluateString(current.arguments[0], context);
        const replacement = evaluateString(current.arguments[1], context);
        return input.replace(search, replacement);
      }
    }
    throw new Error(`Fixture ${context} uses an unsupported hidden-marker expression.`);
  }

  function evaluateStringArray(node, context) {
    const current = unwrap(node);
    if (ts.isIdentifier(current)) {
      const initializer = bindings.get(current.text);
      if (!initializer) throw new Error(`Fixture ${context} uses an unsupported array binding.`);
      return evaluateStringArray(initializer, context);
    }
    if (!ts.isArrayLiteralExpression(current)) {
      throw new Error(`Fixture ${context} uses an unsupported hidden-marker array.`);
    }
    return current.elements.map((element) => evaluateString(element, context));
  }

  return { bindings, evaluateString, evaluateStringArray };
}

export function deriveFixtureHiddenMarkers(source) {
  const sourceFile = ts.createSourceFile(
    "fixtures.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const { bindings, evaluateString, evaluateStringArray } = createStaticEvaluator(sourceFile);
  const registry = bindings.get("challengeFixtures");
  if (!registry || !ts.isArrayLiteralExpression(unwrap(registry))) {
    throw new Error("Fixture registry is not a statically inspectable array.");
  }

  const markers = [];
  const fixtures = unwrap(registry);
  for (const [index, element] of fixtures.elements.entries()) {
    const fixtureCall = unwrap(element);
    if (
      !ts.isCallExpression(fixtureCall) ||
      !ts.isIdentifier(fixtureCall.expression) ||
      fixtureCall.expression.text !== "createFixture" ||
      fixtureCall.arguments.length !== 1 ||
      !ts.isObjectLiteralExpression(unwrap(fixtureCall.arguments[0]))
    ) {
      throw new Error(`Fixture at registry index ${index} is not statically inspectable.`);
    }

    const object = unwrap(fixtureCall.arguments[0]);
    const fallbackId = `registry-index-${index}`;
    const fixtureId = evaluateString(objectProperty(object, "challengeId", fallbackId), fallbackId);
    const rootCause = evaluateString(objectProperty(object, "hiddenRootCause", fixtureId), fixtureId);
    const reference = evaluateString(objectProperty(object, "originalSource", fixtureId), fixtureId);
    const fixed = evaluateString(objectProperty(object, "fixedSnippet", fixtureId), fixtureId);
    const broken = evaluateString(objectProperty(object, "brokenSnippet", fixtureId), fixtureId);
    const hints = evaluateStringArray(objectProperty(object, "hints", fixtureId), fixtureId);

    markers.push(
      { id: `fixture:${fixtureId}:root`, value: rootCause },
      { id: `fixture:${fixtureId}:reference`, value: reference },
      { id: `fixture:${fixtureId}:fixed`, value: fixed },
      { id: `fixture:${fixtureId}:mutation`, value: `${fixed} -> ${broken}` },
      ...hints.map((value, hintIndex) => ({
        id: `fixture:${fixtureId}:hint-${hintIndex + 1}`,
        value,
      })),
    );
  }

  if (markers.some(({ value }) => value.length === 0)) {
    throw new Error("Fixture registry contains an empty hidden marker.");
  }
  return markers;
}

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

export function inspectBundleContent(file, content, markers) {
  const findings = [];
  for (const marker of markers) {
    if (content.includes(marker.value)) findings.push({ file, rule: marker.id });
  }
  return findings;
}

export async function checkClientBundle({
  clientDirectory = defaultClientDirectory,
  fixtureSource = defaultFixtureSource,
} = {}) {
  const fixtureSourceText = await readFile(fixtureSource, "utf8");
  const markers = [...staticForbiddenMarkers, ...deriveFixtureHiddenMarkers(fixtureSourceText)];
  const files = (await collectFiles(clientDirectory)).filter((file) =>
    /\.(?:js|css|html|json)$/.test(file),
  );
  const findings = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    findings.push(
      ...inspectBundleContent(path.relative(repositoryRoot, file), content, markers),
    );
  }

  return { filesInspected: files.length, findings };
}

async function main() {
  const result = await checkClientBundle();
  if (result.findings.length > 0) {
    console.error("Client bundle leakage check failed. Marker values are intentionally not printed.");
    for (const finding of result.findings) {
      console.error(`- ${finding.file} [${finding.rule}]`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Client bundle leakage check passed (${result.filesInspected} artifacts inspected).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
