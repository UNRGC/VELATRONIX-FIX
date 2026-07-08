# Estados de reparación

Los estados los controla el backend (enum). El frontend nunca fija estados libres; solo
invoca acciones y el backend valida la transición y su rol autorizado (`backend/src/repairs/stateMachine.ts`).

| Código interno | Etiqueta pública |
|----------------|------------------|
| `EN_ESPERA_REVISION` | En espera de revisión |
| `EN_DIAGNOSTICO` | En proceso de diagnóstico |
| `DIAGNOSTICADO` | Revisado, consulta el diagnóstico |
| `EN_ESPERA_PAGO` | En espera de pago |
| `PAGO_EN_VALIDACION` | Pago en validación |
| `EN_PROCESO_REPARACION` | En proceso de reparación |
| `REPARACION_REALIZADA` | Reparación realizada |
| `LISTO_PARA_ENTREGA` | Listo para entrega |
| `DEVOLUCION_SIN_REPARACION` | Devolución sin reparación |
| `ENTREGADO_CERRADO` | Entregado / cerrado |

## Transiciones permitidas

| Desde | Hacia | Quién |
|-------|-------|-------|
| EN_ESPERA_REVISION | EN_DIAGNOSTICO | Admin, Técnico asignado |
| EN_ESPERA_REVISION | DEVOLUCION_SIN_REPARACION | Admin |
| EN_DIAGNOSTICO | DIAGNOSTICADO | Admin, Técnico asignado (vía diagnóstico) |
| EN_DIAGNOSTICO | EN_ESPERA_PAGO | Admin, Técnico asignado (vía diagnóstico) |
| DIAGNOSTICADO | EN_ESPERA_PAGO | Admin, Técnico asignado (solicitud de pago) |
| DIAGNOSTICADO | EN_PROCESO_REPARACION | Admin, Técnico asignado |
| DIAGNOSTICADO | DEVOLUCION_SIN_REPARACION | Admin |
| EN_ESPERA_PAGO | PAGO_EN_VALIDACION | Cliente público (sube comprobante) |
| EN_ESPERA_PAGO | EN_PROCESO_REPARACION | Admin, Recepción (confirma efectivo o pago validado) |
| EN_ESPERA_PAGO | REPARACION_REALIZADA | Admin, Recepción (confirma pago final) |
| EN_ESPERA_PAGO | LISTO_PARA_ENTREGA | Admin, Recepción (confirma pago final) |
| EN_ESPERA_PAGO | DEVOLUCION_SIN_REPARACION | Admin |
| PAGO_EN_VALIDACION | EN_PROCESO_REPARACION | Admin, Recepción (valida pago) |
| PAGO_EN_VALIDACION | REPARACION_REALIZADA | Admin, Recepción (valida pago final) |
| PAGO_EN_VALIDACION | LISTO_PARA_ENTREGA | Admin, Recepción (valida pago final) |
| PAGO_EN_VALIDACION | EN_ESPERA_PAGO | Admin, Recepción (rechaza comprobante) |
| EN_PROCESO_REPARACION | REPARACION_REALIZADA | Admin, Técnico asignado |
| EN_PROCESO_REPARACION | EN_ESPERA_PAGO | Admin, Técnico asignado (pago adicional / secuencial) |
| EN_PROCESO_REPARACION | DEVOLUCION_SIN_REPARACION | Admin |
| REPARACION_REALIZADA | LISTO_PARA_ENTREGA | Admin, Técnico asignado |
| REPARACION_REALIZADA | EN_ESPERA_PAGO | Admin, Técnico asignado (pago final) |
| LISTO_PARA_ENTREGA | ENTREGADO_CERRADO | Admin, Recepción |
| LISTO_PARA_ENTREGA | EN_ESPERA_PAGO | Admin, Técnico asignado (pago final o adicional) |
| DEVOLUCION_SIN_REPARACION | ENTREGADO_CERRADO | Admin, Recepción |

`ENTREGADO_CERRADO` es terminal.

## Estados de pago (independientes del estado de reparación)

`NOT_REQUIRED → PENDING → PROOF_RECEIVED → VALIDATED` · o `REJECTED` (reenvío) · o `CANCELLED`.

Cualquier cambio relevante genera una entrada de historial con actor (usuario interno /
cliente público / sistema), notas visibles e internas separadas.
