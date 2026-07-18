import type { ProjectId } from "./contracts";

export type ProjectSummary = {
  id: ProjectId;
  title: string;
  eyebrow: string;
  description: string;
  skills: string[];
  estimatedMinutes: number;
  fileCount: number;
  difficulty: "Beginner → Advanced";
};

export const projects: ProjectSummary[] = [
  {
    id: "expense-approval",
    title: "Expense Approval API",
    eyebrow: "Business logic",
    description: "Trace approval-policy regressions at risky authorization boundaries.",
    skills: ["Boundary conditions", "Authorization logic", "Business-rule interpretation"],
    estimatedMinutes: 8,
    fileCount: 3,
    difficulty: "Beginner → Advanced",
  },
  {
    id: "inventory",
    title: "Inventory Reservation",
    eyebrow: "State management",
    description: "Repair idempotency, transition, and quantity-validation failures.",
    skills: ["Idempotency", "State transitions", "Defensive validation"],
    estimatedMinutes: 12,
    fileCount: 3,
    difficulty: "Beginner → Advanced",
  },
  {
    id: "notifications",
    title: "Notification Preferences",
    eyebrow: "Decision logic",
    description: "Protect explicit choices across Boolean, fallback, and validation rules.",
    skills: ["Boolean logic", "Fallback behavior", "Data validation"],
    estimatedMinutes: 10,
    fileCount: 3,
    difficulty: "Beginner → Advanced",
  },
];

export function getProject(projectId: ProjectId) {
  return projects.find((project) => project.id === projectId);
}

