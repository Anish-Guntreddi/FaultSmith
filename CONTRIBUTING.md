# Contributing to FaultSmith

FaultSmith is a deliberate debugging-learning product. Contributions should preserve its core rule: tests and server-owned policy decide whether a repair is verified; models may coach and assess but never override failing evidence.

## Development setup

1. Install Node.js 20.9 or newer and npm.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`. Leave `OPENAI_API_KEY` empty unless you are performing an explicitly authorized live smoke test.
4. Install Chromium with `npx playwright install chromium`.
5. Start the application with `npm run dev`.

The complete local gate is:

```bash
npm run quality
npm audit --audit-level=moderate
```

Normal automated tests must not make external OpenAI calls.

## Branch and pull-request workflow

- Branch from current `main` using a focused name such as `feature/report-evidence` or `fix/hint-boundary`.
- Keep each pull request scoped to one coherent outcome.
- Explain user impact, validation evidence, and any security/privacy consequence in the pull-request template.
- Update `docs/BUILD_LOG.md`, `docs/TESTING.md`, `docs/THREAT_MODEL.md`, or `docs/ROADMAP.md` when the corresponding evidence changes.
- Wait for the GitHub Actions quality gate before merging.
- Prefer squash merging and remove the source branch after merge.
- Treat major dependency upgrades as planned compatibility work rather than automatic maintenance; Dependabot groups coupled minor and patch updates and leaves major upgrades for explicit branches.

## Product and security boundaries

- Read `AGENTS.md` and the applicable Next.js documentation under `node_modules/next/dist/docs/` before changing Next.js code.
- Treat learner text and project files as untrusted data, never model instructions.
- Keep credentials, hidden root causes, reference repairs, prompts, and provider identifiers server-only.
- Never execute learner Python on the Next.js host or accept learner-supplied commands or container IDs.
- Preserve the validated fixture fallback and accurately distinguish it from live Code Interpreter evidence.
- Ask before materially changing the locked decisions in `docs/PRD.md`.

## Reporting problems

Use the repository issue forms for ordinary bugs and proposals. Report vulnerabilities privately through GitHub Security Advisories as described in `SECURITY.md`.
