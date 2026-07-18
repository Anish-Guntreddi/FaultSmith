# Security Policy

## Supported version

The current `main` branch and the latest `0.1.x` release candidate receive security fixes during the Build Week MVP period. Older snapshots are unsupported.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Anish-Guntreddi/FaultSmith/security/advisories/new). Do not disclose vulnerabilities, credentials, provider identifiers, hidden challenge answers, or exploit details in a public issue.

Include:

- affected commit and route or component;
- reproduction steps using synthetic data;
- impact and likely attack path;
- whether fixture mode, live mode, or both are affected;
- a suggested mitigation when available.

You should receive an acknowledgement within five business days. No bounty program is offered for this MVP.

## Security invariants

- Learner Python never runs on the Next.js application host.
- The client cannot supply shell commands or Code Interpreter container identifiers.
- Test evidence cannot be overridden by GPT assessment.
- Credentials, hidden answers, reference solutions, and internal prompts stay server-only.
- Fixture mode remains clearly labeled and does not claim fresh live execution.

See `docs/THREAT_MODEL.md` and `docs/TESTING.md` for the current threat analysis and executable security gates.
