import { cn } from "./variants";

export type EvidenceLedgerItem = {
  title: string;
  description: string;
  signal: string;
  tone?: "amber" | "cyan" | "green";
};

type EvidenceLedgerProps = {
  items: readonly EvidenceLedgerItem[];
  className?: string;
};

/** An ordered, audit-log treatment for product guarantees and evidence. */
export function EvidenceLedger({ items, className }: EvidenceLedgerProps) {
  return (
    <ol className={cn("ui-evidence-ledger", className)}>
      {items.map((item, index) => (
        <li key={item.title} className={`ui-evidence-record ui-evidence-record-${item.tone ?? "amber"}`}>
          <div aria-hidden="true" className="ui-evidence-record-index">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i />
          </div>
          <div className="ui-evidence-record-copy">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="ui-evidence-record-signal">
              <span aria-hidden="true">◆</span>
              {item.signal}
            </div>
          </div>
          <span aria-hidden="true" className="ui-evidence-record-seal">verified</span>
        </li>
      ))}
    </ol>
  );
}
