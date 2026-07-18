import "server-only";

import type { Difficulty, FileSnapshot, ProjectId } from "@/lib/contracts";
import type { MutationPlan } from "@/server/mutation-contract";

export type ChallengeFixture = MutationPlan & {
  originalFiles: FileSnapshot[];
  mutatedFiles: FileSnapshot[];
  visibleFiles: Array<FileSnapshot & { editable: boolean }>;
  brokenSnippet: string;
  fixedSnippet: string;
  explanationSignals: [string[], string[], string[]];
  passedCount: number;
  failureOutput: string;
  successOutput: string;
  maxChangedLines: number;
};

type FixtureInput = Omit<
  ChallengeFixture,
  | "mutationPatch"
  | "hiddenReferenceSolution"
  | "visibleFiles"
  | "successOutput"
  | "originalFiles"
  | "mutatedFiles"
> & {
  sourcePath: string;
  originalSource: string;
  mutatedSource: string;
  testsSource: string;
  readme: string;
};

function lines(value: string[]) {
  return `${value.join("\n")}\n`;
}

function createFixture(input: FixtureInput): ChallengeFixture {
  const originalFiles = [{ path: input.sourcePath, content: input.originalSource }];
  const mutatedFiles = [{ path: input.sourcePath, content: input.mutatedSource }];
  const testPath = `tests/test_${input.projectId.replaceAll("-", "_")}.py`;

  return {
    challengeId: input.challengeId,
    projectId: input.projectId,
    title: input.title,
    targetSkill: input.targetSkill,
    difficulty: input.difficulty,
    learningObjective: input.learningObjective,
    learnerBrief: input.learnerBrief,
    allowedFiles: input.allowedFiles,
    mutationPatch: `${input.fixedSnippet} -> ${input.brokenSnippet}`,
    expectedFailureTests: input.expectedFailureTests,
    expectedFailureSignature: input.expectedFailureSignature,
    hiddenRootCause: input.hiddenRootCause,
    hiddenReferenceSolution: input.originalSource,
    hints: input.hints,
    rubric: input.rubric,
    originalFiles,
    mutatedFiles,
    visibleFiles: [
      { path: input.sourcePath, content: input.mutatedSource, editable: true },
      { path: testPath, content: input.testsSource, editable: false },
      { path: "README.md", content: input.readme, editable: false },
    ],
    brokenSnippet: input.brokenSnippet,
    fixedSnippet: input.fixedSnippet,
    explanationSignals: input.explanationSignals,
    passedCount: input.passedCount,
    failureOutput: input.failureOutput,
    successOutput: lines([
      `${testPath} ${".".repeat(input.passedCount)} [100%]`,
      "",
      `======================= ${input.passedCount} passed in 0.05s =======================`,
    ]),
    maxChangedLines: input.maxChangedLines,
  };
}

const rubric = {
  rootCauseCriteria: ["Identifies the exact mutated condition and failing behavior."],
  conceptCriteria: ["Connects the repair to the named debugging concept."],
  patchDisciplineCriteria: ["Changes only the allowlisted source and keeps the patch minimal."],
};

const expenseBoundaryOriginal = lines([
  "from dataclasses import dataclass",
  "",
  "@dataclass",
  "class Expense:",
  "    amount: float",
  "    submitted_by: str",
  "",
  "def approval_route(expense: Expense) -> str:",
  "    if expense.amount >= 500:",
  "        return \"finance_review\"",
  "    return \"manager_approval\"",
]);
const expenseBoundaryMutated = expenseBoundaryOriginal.replace(">= 500", "> 500");

const expenseAuthorizationOriginal = lines([
  "def can_auto_approve(role: str, amount: float) -> bool:",
  "    return role == \"finance\" and amount < 500",
]);
const expenseAuthorizationMutated = expenseAuthorizationOriginal.replace(" and ", " or ");

const expenseReceiptOriginal = lines([
  "def needs_receipt(amount: float) -> bool:",
  "    return amount >= 25",
]);
const expenseReceiptMutated = expenseReceiptOriginal.replace(">= 25", "> 25");

const inventoryIdempotencyOriginal = lines([
  "def reserve(stock: int, quantity: int, request_id: str, processed: set[str]) -> int:",
  "    if request_id in processed:",
  "        return stock",
  "    processed.add(request_id)",
  "    return stock - quantity",
]);
const inventoryIdempotencyMutated = inventoryIdempotencyOriginal.replace(
  "        return stock",
  "        pass",
);

const inventoryStateOriginal = lines([
  "def cancel_reservation(state: str) -> str:",
  "    if state != \"reserved\":",
  "        raise ValueError(\"Only active reservations can be cancelled\")",
  "    return \"cancelled\"",
]);
const inventoryStateMutated = inventoryStateOriginal.replace(
  "state != \"reserved\"",
  "state not in {\"reserved\", \"cancelled\"}",
);

const inventoryQuantityOriginal = lines([
  "def validate_quantity(quantity: int) -> int:",
  "    if quantity <= 0:",
  "        raise ValueError(\"Quantity must be positive\")",
  "    return quantity",
]);
const inventoryQuantityMutated = inventoryQuantityOriginal.replace("<= 0", "< 0");

const notificationOptOutOriginal = lines([
  "def notifications_enabled(explicit: bool | None, default_enabled: bool) -> bool:",
  "    return default_enabled if explicit is None else explicit",
]);
const notificationOptOutMutated = notificationOptOutOriginal.replace(
  "default_enabled if explicit is None else explicit",
  "explicit or default_enabled",
);

const notificationQuietOriginal = lines([
  "def is_quiet_hour(hour: int) -> bool:",
  "    return hour >= 22 or hour < 7",
]);
const notificationQuietMutated = notificationQuietOriginal.replace(">= 22", "> 22");

const notificationChannelOriginal = lines([
  "ALLOWED_CHANNELS = {\"email\", \"push\", \"sms\"}",
  "",
  "def validate_channel(channel: str) -> str:",
  "    if channel not in ALLOWED_CHANNELS:",
  "        raise ValueError(\"Unsupported channel\")",
  "    return channel",
]);
const notificationChannelMutated = notificationChannelOriginal.replace(
  "        raise ValueError(\"Unsupported channel\")",
  "        return \"email\"",
);

export const challengeFixtures: ChallengeFixture[] = [
  createFixture({
    challengeId: "expense-boundary-v1",
    projectId: "expense-approval",
    title: "The missing exact-threshold approval",
    targetSkill: "Boundary conditions",
    difficulty: "intermediate",
    learningObjective: "Translate an inclusive policy boundary into executable logic.",
    learnerBrief: "Policy requires finance review for expenses of $500 or more, but the exact threshold is routed to a manager.",
    allowedFiles: ["approvals.py"],
    expectedFailureTests: ["test_exact_threshold_requires_finance"],
    expectedFailureSignature: "manager_approval != finance_review at amount=500",
    hiddenRootCause: "The mutation changed the inclusive >= comparison to >, excluding exactly 500.",
    explanationSignals: [
      ["500", "exact threshold"],
      ["greater-than", "strict comparison", "excludes"],
      ["inclusive", ">=", "or more"],
    ],
    hints: [
      "Compare the failing input with the closest passing inputs around the policy boundary.",
      "Focus on the comparison inside approval_route and translate ‘or more’ precisely.",
      "Check whether the comparison includes 500 itself; the repair is a one-character change.",
    ],
    rubric,
    sourcePath: "approvals.py",
    originalSource: expenseBoundaryOriginal,
    mutatedSource: expenseBoundaryMutated,
    testsSource: lines([
      "from approvals import Expense, approval_route",
      "",
      "def test_exact_threshold_requires_finance():",
      "    assert approval_route(Expense(500, \"ana\")) == \"finance_review\"",
      "",
      "def test_below_threshold_uses_manager():",
      "    assert approval_route(Expense(499.99, \"ana\")) == \"manager_approval\"",
      "",
      "def test_zero_uses_manager():",
      "    assert approval_route(Expense(0, \"ana\")) == \"manager_approval\"",
      "",
      "def test_just_above_threshold_requires_finance():",
      "    assert approval_route(Expense(500.01, \"ana\")) == \"finance_review\"",
      "",
      "def test_large_expense_requires_finance():",
      "    assert approval_route(Expense(1200, \"ana\")) == \"finance_review\"",
      "",
      "def test_negative_adjustment_uses_manager():",
      "    assert approval_route(Expense(-10, \"ana\")) == \"manager_approval\"",
    ]),
    readme: "# Expense Approval API\n\nExpenses of $500 or more require finance review.\n",
    brokenSnippet: "if expense.amount > 500:",
    fixedSnippet: "if expense.amount >= 500:",
    passedCount: 6,
    failureOutput: lines([
      "tests/test_expense_approval.py ...F.. [100%]",
      "FAILED test_exact_threshold_requires_finance",
      "E AssertionError: manager_approval != finance_review at amount=500",
      "1 failed, 5 passed in 0.05s",
    ]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "expense-authorization-v1",
    projectId: "expense-approval",
    title: "The over-permissive auto-approval rule",
    targetSkill: "Authorization logic",
    difficulty: "advanced",
    learningObjective: "Preserve every required authorization predicate in a compound rule.",
    learnerBrief: "Low-value expenses from non-finance users are being auto-approved even though both finance role and amount constraints are required.",
    allowedFiles: ["policy.py"],
    expectedFailureTests: ["test_employee_cannot_auto_approve"],
    expectedFailureSignature: "employee role unexpectedly auto-approved",
    hiddenRootCause: "The mutation changed conjunction to disjunction, so satisfying either predicate grants approval.",
    explanationSignals: [
      ["finance", "role"],
      ["amount", "500"],
      ["both", "and", "conjunction"],
    ],
    hints: ["List every condition that must be true before auto-approval is allowed.", "Inspect the Boolean connector between role and amount checks.", "The rule requires both predicates, not either predicate."],
    rubric,
    sourcePath: "policy.py",
    originalSource: expenseAuthorizationOriginal,
    mutatedSource: expenseAuthorizationMutated,
    testsSource: lines([
      "from policy import can_auto_approve",
      "",
      "def test_employee_cannot_auto_approve():",
      "    assert not can_auto_approve(\"employee\", 100)",
      "",
      "def test_finance_can_auto_approve_low_value():",
      "    assert can_auto_approve(\"finance\", 100)",
      "",
      "def test_finance_can_auto_approve_zero_value():",
      "    assert can_auto_approve(\"finance\", 0)",
      "",
      "def test_employee_at_limit_is_not_auto_approved():",
      "    assert not can_auto_approve(\"employee\", 500)",
      "",
      "def test_employee_high_value_is_not_auto_approved():",
      "    assert not can_auto_approve(\"employee\", 1200)",
    ]),
    readme: "# Expense policy\n\nOnly finance users may auto-approve low-value expenses.\n",
    brokenSnippet: "role == \"finance\" or amount < 500",
    fixedSnippet: "role == \"finance\" and amount < 500",
    passedCount: 5,
    failureOutput: lines(["tests/test_expense_approval.py F.... [100%]", "FAILED test_employee_cannot_auto_approve", "E AssertionError: employee role unexpectedly auto-approved", "1 failed, 4 passed in 0.05s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "expense-receipt-v1",
    projectId: "expense-approval",
    title: "The receipt policy edge",
    targetSkill: "Business-rule interpretation",
    difficulty: "beginner",
    learningObjective: "Implement an exact monetary business-rule boundary.",
    learnerBrief: "Receipts are required for purchases of $25 or more, but exactly $25 is currently exempted.",
    allowedFiles: ["receipts.py"],
    expectedFailureTests: ["test_receipt_required_at_threshold"],
    expectedFailureSignature: "receipt not required at amount=25",
    hiddenRootCause: "The receipt comparison excludes the exact policy threshold.",
    explanationSignals: [
      ["receipt"],
      ["25", "threshold"],
      ["inclusive", ">=", "or more"],
    ],
    hints: ["Read the policy phrase ‘or more’ literally.", "Compare the behavior at 24.99, 25, and 25.01.", "Make the greater-than comparison inclusive."],
    rubric,
    sourcePath: "receipts.py",
    originalSource: expenseReceiptOriginal,
    mutatedSource: expenseReceiptMutated,
    testsSource: lines([
      "from receipts import needs_receipt",
      "",
      "def test_receipt_required_at_threshold():",
      "    assert needs_receipt(25)",
      "",
      "def test_receipt_not_required_below_threshold():",
      "    assert not needs_receipt(24.99)",
      "",
      "def test_receipt_required_just_above_threshold():",
      "    assert needs_receipt(25.01)",
      "",
      "def test_receipt_required_for_large_purchase():",
      "    assert needs_receipt(1000)",
    ]),
    readme: "# Receipt policy\n\nReceipts are required at $25 and above.\n",
    brokenSnippet: "return amount > 25",
    fixedSnippet: "return amount >= 25",
    passedCount: 4,
    failureOutput: lines(["tests/test_expense_approval.py ..F. [100%]", "FAILED test_receipt_required_at_threshold", "E AssertionError: receipt not required at amount=25", "1 failed, 3 passed in 0.04s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "inventory-idempotency-v1",
    projectId: "inventory",
    title: "The duplicate reservation decrement",
    targetSkill: "Idempotency",
    difficulty: "intermediate",
    learningObjective: "Make retries safe by returning the previously established state.",
    learnerBrief: "Retrying a reservation with the same request ID decrements inventory a second time.",
    allowedFiles: ["reservations.py"],
    expectedFailureTests: ["test_duplicate_request_is_idempotent"],
    expectedFailureSignature: "stock decremented twice for the same request_id",
    hiddenRootCause: "The duplicate-request branch no longer returns early, so execution falls through to the decrement.",
    explanationSignals: [
      ["duplicate", "repeated", "request_id"],
      ["return early", "returns early", "fall through"],
      ["decrement", "stock", "idempotent"],
    ],
    hints: ["Trace the second call using the same request ID.", "Inspect what the processed-request branch does before the stock mutation.", "A recognized request must return before processed.add and subtraction."],
    rubric,
    sourcePath: "reservations.py",
    originalSource: inventoryIdempotencyOriginal,
    mutatedSource: inventoryIdempotencyMutated,
    testsSource: lines([
      "from reservations import reserve",
      "",
      "def test_duplicate_request_is_idempotent():",
      "    processed = {\"req-1\"}",
      "    assert reserve(8, 2, \"req-1\", processed) == 8",
      "",
      "def test_new_request_decrements_stock():",
      "    assert reserve(8, 2, \"req-2\", set()) == 6",
      "",
      "def test_new_request_records_id():",
      "    processed = set()",
      "    reserve(8, 2, \"req-3\", processed)",
      "    assert processed == {\"req-3\"}",
      "",
      "def test_zero_quantity_preserves_stock():",
      "    assert reserve(8, 0, \"req-4\", set()) == 8",
      "",
      "def test_full_stock_reservation_reaches_zero():",
      "    assert reserve(8, 8, \"req-5\", set()) == 0",
      "",
      "def test_distinct_request_uses_its_quantity():",
      "    assert reserve(20, 3, \"req-6\", {\"req-old\"}) == 17",
    ]),
    readme: "# Inventory Reservation\n\nReservation request IDs are idempotency keys.\n",
    brokenSnippet: "        pass",
    fixedSnippet: "        return stock",
    passedCount: 6,
    failureOutput: lines(["tests/test_inventory.py ...F.. [100%]", "FAILED test_duplicate_request_is_idempotent", "E AssertionError: stock decremented twice for the same request_id", "1 failed, 5 passed in 0.05s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "inventory-state-v1",
    projectId: "inventory",
    title: "The repeated cancellation transition",
    targetSkill: "State transitions",
    difficulty: "advanced",
    learningObjective: "Reject transitions that do not originate from the single valid state.",
    learnerBrief: "An already-cancelled reservation can be cancelled again instead of being rejected.",
    allowedFiles: ["state.py"],
    expectedFailureTests: ["test_cancelled_reservation_cannot_cancel_again"],
    expectedFailureSignature: "cancelled -> cancelled transition was accepted",
    hiddenRootCause: "The guard allowlists both reserved and cancelled states instead of only reserved.",
    explanationSignals: [
      ["reserved"],
      ["cancelled", "canceled"],
      ["state", "transition", "guard"],
    ],
    hints: ["Write down the one valid source state for cancellation.", "Inspect the membership check in the transition guard.", "Reject every state other than reserved."],
    rubric,
    sourcePath: "state.py",
    originalSource: inventoryStateOriginal,
    mutatedSource: inventoryStateMutated,
    testsSource: lines([
      "import pytest",
      "from state import cancel_reservation",
      "",
      "def test_cancelled_reservation_cannot_cancel_again():",
      "    with pytest.raises(ValueError):",
      "        cancel_reservation(\"cancelled\")",
      "",
      "def test_reserved_reservation_can_cancel():",
      "    assert cancel_reservation(\"reserved\") == \"cancelled\"",
      "",
      "def test_pending_reservation_cannot_cancel():",
      "    with pytest.raises(ValueError):",
      "        cancel_reservation(\"pending\")",
      "",
      "def test_fulfilled_reservation_cannot_cancel():",
      "    with pytest.raises(ValueError):",
      "        cancel_reservation(\"fulfilled\")",
      "",
      "def test_unknown_state_cannot_cancel():",
      "    with pytest.raises(ValueError):",
      "        cancel_reservation(\"unknown\")",
    ]),
    readme: "# Reservation state\n\nOnly active reserved inventory may transition to cancelled.\n",
    brokenSnippet: "state not in {\"reserved\", \"cancelled\"}",
    fixedSnippet: "state != \"reserved\"",
    passedCount: 5,
    failureOutput: lines(["tests/test_inventory.py .F... [100%]", "FAILED test_cancelled_reservation_cannot_cancel_again", "E Failed: DID NOT RAISE ValueError", "1 failed, 4 passed in 0.04s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "inventory-validation-v1",
    projectId: "inventory",
    title: "The zero-quantity reservation",
    targetSkill: "Defensive validation",
    difficulty: "beginner",
    learningObjective: "Reject invalid zero values at an input boundary.",
    learnerBrief: "A reservation for zero units passes validation even though quantities must be positive.",
    allowedFiles: ["validation.py"],
    expectedFailureTests: ["test_zero_quantity_is_rejected"],
    expectedFailureSignature: "zero quantity was accepted",
    hiddenRootCause: "The validation rejects negative values but excludes zero from the invalid range.",
    explanationSignals: [
      ["zero", "0"],
      ["positive", "invalid"],
      ["inclusive", "<=", "boundary"],
    ],
    hints: ["Define the complete invalid range for a positive integer.", "Check the behavior at -1, 0, and 1.", "The invalid comparison must include zero."],
    rubric,
    sourcePath: "validation.py",
    originalSource: inventoryQuantityOriginal,
    mutatedSource: inventoryQuantityMutated,
    testsSource: lines([
      "import pytest",
      "from validation import validate_quantity",
      "",
      "def test_zero_quantity_is_rejected():",
      "    with pytest.raises(ValueError):",
      "        validate_quantity(0)",
      "",
      "def test_negative_quantity_is_rejected():",
      "    with pytest.raises(ValueError):",
      "        validate_quantity(-1)",
      "",
      "def test_one_is_valid():",
      "    assert validate_quantity(1) == 1",
      "",
      "def test_large_quantity_is_valid():",
      "    assert validate_quantity(1000) == 1000",
      "",
      "def test_valid_quantity_is_returned_unchanged():",
      "    assert validate_quantity(7) == 7",
    ]),
    readme: "# Quantity validation\n\nReservation quantities must be positive integers.\n",
    brokenSnippet: "if quantity < 0:",
    fixedSnippet: "if quantity <= 0:",
    passedCount: 5,
    failureOutput: lines(["tests/test_inventory.py ..F.. [100%]", "FAILED test_zero_quantity_is_rejected", "E Failed: DID NOT RAISE ValueError", "1 failed, 4 passed in 0.04s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "notifications-opt-out-v1",
    projectId: "notifications",
    title: "The ignored explicit opt-out",
    targetSkill: "Fallback behavior",
    difficulty: "intermediate",
    learningObjective: "Distinguish an explicit false value from missing data.",
    learnerBrief: "A user's explicit opt-out is overwritten when the system default is enabled.",
    allowedFiles: ["preferences.py"],
    expectedFailureTests: ["test_explicit_opt_out_wins"],
    expectedFailureSignature: "explicit False replaced by default True",
    hiddenRootCause: "Boolean or treats explicit False as absent and substitutes the default.",
    explanationSignals: [
      ["explicit", "opt-out", "false"],
      ["default"],
      ["none", "absent", "or"],
    ],
    hints: ["Compare missing, true, and false preference values separately.", "Falsy is not the same as missing in this rule.", "Use the default only when the explicit value is None."],
    rubric,
    sourcePath: "preferences.py",
    originalSource: notificationOptOutOriginal,
    mutatedSource: notificationOptOutMutated,
    testsSource: lines([
      "from preferences import notifications_enabled",
      "",
      "def test_explicit_opt_out_wins():",
      "    assert notifications_enabled(False, True) is False",
      "",
      "def test_missing_preference_uses_enabled_default():",
      "    assert notifications_enabled(None, True) is True",
      "",
      "def test_missing_preference_uses_disabled_default():",
      "    assert notifications_enabled(None, False) is False",
      "",
      "def test_explicit_opt_in_overrides_disabled_default():",
      "    assert notifications_enabled(True, False) is True",
      "",
      "def test_explicit_opt_in_matches_enabled_default():",
      "    assert notifications_enabled(True, True) is True",
      "",
      "def test_explicit_opt_out_matches_disabled_default():",
      "    assert notifications_enabled(False, False) is False",
    ]),
    readme: "# Notification preferences\n\nExplicit user choices always override defaults.\n",
    brokenSnippet: "return explicit or default_enabled",
    fixedSnippet: "return default_enabled if explicit is None else explicit",
    passedCount: 6,
    failureOutput: lines(["tests/test_notifications.py ...F.. [100%]", "FAILED test_explicit_opt_out_wins", "E AssertionError: explicit False replaced by default True", "1 failed, 5 passed in 0.05s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "notifications-boolean-v1",
    projectId: "notifications",
    title: "The quiet-hours boundary",
    targetSkill: "Boolean logic",
    difficulty: "beginner",
    learningObjective: "Reason about an inclusive boundary inside a compound Boolean rule.",
    learnerBrief: "Notifications are still sent at exactly 22:00 even though quiet hours begin then.",
    allowedFiles: ["quiet_hours.py"],
    expectedFailureTests: ["test_quiet_hours_begin_at_22"],
    expectedFailureSignature: "22:00 classified as active",
    hiddenRootCause: "The evening condition uses > instead of >= and excludes the start hour.",
    explanationSignals: [
      ["22", "start hour"],
      ["quiet", "evening"],
      ["inclusive", ">=", "excludes"],
    ],
    hints: ["Evaluate the compound rule at the first quiet hour.", "The morning branch is correct; focus on the evening boundary.", "Include 22 in the quiet range."],
    rubric,
    sourcePath: "quiet_hours.py",
    originalSource: notificationQuietOriginal,
    mutatedSource: notificationQuietMutated,
    testsSource: lines([
      "from quiet_hours import is_quiet_hour",
      "",
      "def test_quiet_hours_begin_at_22():",
      "    assert is_quiet_hour(22)",
      "",
      "def test_23_is_quiet():",
      "    assert is_quiet_hour(23)",
      "",
      "def test_midnight_is_quiet():",
      "    assert is_quiet_hour(0)",
      "",
      "def test_6_is_quiet():",
      "    assert is_quiet_hour(6)",
      "",
      "def test_7_is_active():",
      "    assert not is_quiet_hour(7)",
      "",
      "def test_noon_is_active():",
      "    assert not is_quiet_hour(12)",
      "",
      "def test_21_is_active():",
      "    assert not is_quiet_hour(21)",
    ]),
    readme: "# Quiet hours\n\nQuiet hours run from 22:00 through 06:59.\n",
    brokenSnippet: "hour > 22",
    fixedSnippet: "hour >= 22",
    passedCount: 7,
    failureOutput: lines(["tests/test_notifications.py .....F. [100%]", "FAILED test_quiet_hours_begin_at_22", "E AssertionError: 22:00 classified as active", "1 failed, 6 passed in 0.05s"]),
    maxChangedLines: 2,
  }),
  createFixture({
    challengeId: "notifications-validation-v1",
    projectId: "notifications",
    title: "The silent unknown-channel fallback",
    targetSkill: "Data validation",
    difficulty: "advanced",
    learningObjective: "Reject unsupported enumerated input instead of silently changing intent.",
    learnerBrief: "An unknown notification channel silently becomes email instead of producing a validation error.",
    allowedFiles: ["channels.py"],
    expectedFailureTests: ["test_unknown_channel_is_rejected"],
    expectedFailureSignature: "unsupported channel silently defaulted to email",
    hiddenRootCause: "The invalid-input branch returns a default channel instead of raising the required error.",
    explanationSignals: [
      ["invalid", "unsupported"],
      ["raise", "error", "exception"],
      ["default", "email", "fallback"],
    ],
    hints: ["Check whether normalization is permitted by the documented contract.", "Follow the branch taken by an unknown channel.", "Invalid channels must raise, not silently choose email."],
    rubric,
    sourcePath: "channels.py",
    originalSource: notificationChannelOriginal,
    mutatedSource: notificationChannelMutated,
    testsSource: lines([
      "import pytest",
      "from channels import ALLOWED_CHANNELS, validate_channel",
      "",
      "def test_unknown_channel_is_rejected():",
      "    with pytest.raises(ValueError):",
      "        validate_channel(\"fax\")",
      "",
      "def test_email_is_accepted():",
      "    assert validate_channel(\"email\") == \"email\"",
      "",
      "def test_push_is_accepted():",
      "    assert validate_channel(\"push\") == \"push\"",
      "",
      "def test_sms_is_accepted():",
      "    assert validate_channel(\"sms\") == \"sms\"",
      "",
      "def test_allowed_channel_catalog_is_exact():",
      "    assert ALLOWED_CHANNELS == {\"email\", \"push\", \"sms\"}",
    ]),
    readme: "# Notification channels\n\nSupported channels are email, push, and sms.\n",
    brokenSnippet: "return \"email\"",
    fixedSnippet: "raise ValueError(\"Unsupported channel\")",
    passedCount: 5,
    failureOutput: lines(["tests/test_notifications.py F.... [100%]", "FAILED test_unknown_channel_is_rejected", "E Failed: DID NOT RAISE ValueError", "1 failed, 4 passed in 0.04s"]),
    maxChangedLines: 2,
  }),
];

export function getFixture(challengeId: string) {
  return challengeFixtures.find((fixture) => fixture.challengeId === challengeId);
}

export function selectFixture(projectId: ProjectId, targetSkill: string) {
  return challengeFixtures.find(
    (fixture) => fixture.projectId === projectId && fixture.targetSkill === targetSkill,
  );
}

export function withRequestedDifficulty(fixture: ChallengeFixture, difficulty: Difficulty) {
  return { ...fixture, difficulty } satisfies ChallengeFixture;
}
