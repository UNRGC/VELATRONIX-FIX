import { RAIL_STEPS, STATUS, RepairStatus } from '../lib/status';

// Orden canónico completo: la devolución vive entre "listo para entrega" y "entregado".
const ORDER: RepairStatus[] = [...RAIL_STEPS.slice(0, -1), 'DEVOLUCION_SIN_REPARACION', 'ENTREGADO_CERRADO'];

/**
 * Riel de estados (elemento firma): la secuencia de la reparación como indicadores
 * de señal, con el estado actual encendido. Se construye a partir de los estados
 * realmente visitados (`visited`, derivado del historial) más los pasos futuros del
 * flujo normal, para no pintar como completados pasos que se saltaron (pago en
 * efectivo o sin pago, devolución sin reparación, retrocesos por pagos adicionales).
 */
export function StatusRail({ status, visited = [] }: { status: RepairStatus; visited?: RepairStatus[] }) {
  const seen = new Set<RepairStatus>([...visited, status]);
  const returned = seen.has('DEVOLUCION_SIN_REPARACION');
  const currentMainIdx = RAIL_STEPS.indexOf(status);

  // Pasos visitados siempre; futuros solo en el flujo normal (una devolución es rama terminal).
  const steps = ORDER.filter((s) => seen.has(s) || (!returned && RAIL_STEPS.indexOf(s) > currentMainIdx));

  return (
    <div className={`rail${status === 'DEVOLUCION_SIN_REPARACION' ? ' terminated' : ''}`}>
      {steps.map((step) => {
        const state = step === status ? 'current' : seen.has(step) ? 'done' : 'upcoming';
        return (
          <div key={step} className={`rail-step ${state}`}>
            <div className="rail-dot" />
            <div className="rail-label">{STATUS[step].label}</div>
          </div>
        );
      })}
    </div>
  );
}
