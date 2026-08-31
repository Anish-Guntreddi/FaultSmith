# How this was built

FaultSmith was built for OpenAI Build Week (Education track) as an AI-assisted implementation under the author's direction. The author owned the architecture, requirements, evaluation design, security boundaries, test strategy, and product decisions (see [Authorship](README.md#authorship) in the README); this document records the tooling used to produce the code itself.

## Implementation tooling

Codex was the primary implementation environment for this task, and this repository's task/build record is the primary build record. Under the author's direction, Codex generated the application code, API integration, fixtures, validation logic, security hardening, tests, browser review, and documentation described in [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

GPT-5.6 is substantive runtime functionality within the product itself, not a build-time tool: it powers strict mutation planning and explanation assessment at runtime. Code Interpreter is the live Python execution boundary used at runtime for the optional live-verification path.

## What was not done

No secondary Claude Code review was performed. That absence is recorded here rather than represented as completed. The fixture fallback is a reliability feature, not a claim that live verification occurred without a credential.

## Further detail

- [Build and review log](docs/BUILD_LOG.md)
- [Completion report](docs/COMPLETION_REPORT.md) — Definition of Finished evidence
- [Testing guide and QA matrix](docs/TESTING.md)
