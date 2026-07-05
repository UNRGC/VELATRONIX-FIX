import { RAIL_STEPS, STATUS, RepairStatus } from '../lib/status';

/**
 * Riel de estados (elemento firma): la secuencia de la reparación como indicadores
 * de señal, con el estado actual encendido. La devolución sin reparación es una
 * rama terminal alterna: se muestra en su propio paso rojo.
 */
export function StatusRail({ status }: { status: RepairStatus }) {
  const isReturn = status === 'DEVOLUCION_SIN_REPARACION';
  const steps: RepairStatus[] = isReturn
    ? ['EN_ESPERA_REVISION', 'EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'DEVOLUCION_SIN_REPARACION']
    : RAIL_STEPS;

  const currentIdx = steps.indexOf(status);

  return (
    <div className={`rail${isReturn ? ' terminated' : ''}`}>
      {steps.map((step, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming';
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
