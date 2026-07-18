# Curated Sample Projects

FaultSmith’s MVP uses three small, server-owned Python systems. Every challenge exposes one editable source file, one read-only pytest suite, and one read-only README. Each approved mutation has a reference source, a stable expected failure signature, three progressive hints, an edit allowlist, and a minimal-repair boundary.

No project accepts uploaded dependencies, shell commands, arbitrary file paths, or arbitrary repository content.

## Expense Approval API

**Domain:** business logic  
**Estimated exercise time:** 8 minutes  
**Difficulty range:** beginner through advanced

| Target skill | Challenge | Editable file | Tests | Intended failure |
| --- | --- | --- | ---: | --- |
| Boundary conditions | The missing exact-threshold approval | `approvals.py` | 6 | exactly $500 skips finance review |
| Authorization logic | The over-permissive auto-approval rule | `policy.py` | 5 | a non-finance employee is auto-approved |
| Business-rule interpretation | The receipt policy edge | `receipts.py` | 4 | exactly $25 does not require a receipt |

Primary visible tree:

```text
approvals.py                  editable
tests/test_expense_approval.py  read only
README.md                     read only
```

## Inventory Reservation

**Domain:** state management  
**Estimated exercise time:** 12 minutes  
**Difficulty range:** beginner through advanced

| Target skill | Challenge | Editable file | Tests | Intended failure |
| --- | --- | --- | ---: | --- |
| Idempotency | The duplicate reservation decrement | `reservations.py` | 6 | retrying a request decrements stock twice |
| State transitions | The repeated cancellation transition | `state.py` | 5 | cancelled inventory can be cancelled again |
| Defensive validation | The zero-quantity reservation | `validation.py` | 5 | a quantity of zero passes validation |

Visible test path: `tests/test_inventory.py`.

## Notification Preferences

**Domain:** decision logic  
**Estimated exercise time:** 10 minutes  
**Difficulty range:** beginner through advanced

| Target skill | Challenge | Editable file | Tests | Intended failure |
| --- | --- | --- | ---: | --- |
| Boolean logic | The quiet-hours boundary | `quiet_hours.py` | 7 | 22:00 is treated as active time |
| Fallback behavior | The ignored explicit opt-out | `preferences.py` | 6 | explicit `False` is replaced by the default |
| Data validation | The silent unknown-channel fallback | `channels.py` | 5 | an unsupported channel silently becomes email |

Visible test path: `tests/test_notifications.py`.

## Validation lifecycle

For every catalog entry, the registry proves the expected lifecycle without executing learner Python on the application host:

1. The server-owned original snapshot matches the approved passing contract.
2. The server-owned mutation reproduces exactly one expected failure transcript.
3. The visible pytest file contains the same number of test functions reported by the transcript.
4. The reference repair returns the deterministic verifier to passing.
5. Incorrect, missing, duplicate, non-allowlisted, or overbroad submissions are rejected.

In live mode, the same source and pytest snapshots are sent to OpenAI Code Interpreter for isolated execution. Live execution evidence remains a separate credential-controlled smoke gate.
