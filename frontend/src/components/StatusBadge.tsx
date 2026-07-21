import { STATUS, RepairStatus } from '../lib/status';

// `label` permite usar la etiqueta que ya envía el backend (fuente de verdad)
// en vez de la copia local; el tono sigue siendo decisión visual del frontend.
export function StatusBadge({ status, label }: { status: RepairStatus; label?: string }) {
  const s = STATUS[status];
  if (!s) return <span className="badge tone-done">{label ?? status}</span>;
  return (
    <span className={`badge tone-${s.tone}`}>
      <span className="led" />
      {label ?? s.label}
    </span>
  );
}
