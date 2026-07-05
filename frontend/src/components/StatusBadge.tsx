import { STATUS, RepairStatus } from '../lib/status';

export function StatusBadge({ status }: { status: RepairStatus }) {
  const s = STATUS[status];
  if (!s) return <span className="badge tone-done">{status}</span>;
  return (
    <span className={`badge tone-${s.tone}`}>
      <span className="led" />
      {s.label}
    </span>
  );
}
