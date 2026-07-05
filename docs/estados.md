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
| EN_ESPERA_REVISION | EN_DIAGNOSTICO | Admin, Recepción, Técnico |
| EN_ESPERA_REVISION | DEVOLUCION_SIN_REPARACION | Admin |
| EN_DIAGNOSTICO | DIAGNOSTICADO | Admin, Recepción, Técnico (vía diagnóstico) |
| EN_DIAGNOSTICO | EN_ESPERA_PAGO | Admin, Recepción, Técnico (vía diagnóstico) |
| DIAGNOSTICADO | EN_ESPERA_PAGO | Admin, Recepción, Técnico (solicitud de pago) |
| DIAGNOSTICADO | EN_PROCESO_REPARACION | Admin |
| DIAGNOSTICADO | DEVOLUCION_SIN_REPARACION | Admin |
| EN_ESPERA_PAGO | PAGO_EN_VALIDACION | Cliente público (sube comprobante) |
| EN_ESPERA_PAGO | EN_PROCESO_REPARACION | Admin (confirma efectivo) |
| EN_ESPERA_PAGO | DEVOLUCION_SIN_REPARACION | Admin |
| PAGO_EN_VALIDACION | EN_PROCESO_REPARACION | Admin (valida pago) |
| PAGO_EN_VALIDACION | EN_ESPERA_PAGO | Admin (rechaza comprobante) |
| EN_PROCESO_REPARACION | REPARACION_REALIZADA | Admin, Técnico |
| EN_PROCESO_REPARACION | EN_ESPERA_PAGO | Admin, Recepción, Técnico (pago adicional / secuencial) |
| EN_PROCESO_REPARACION | DEVOLUCION_SIN_REPARACION | Admin |
| REPARACION_REALIZADA | LISTO_PARA_ENTREGA | Admin |
| LISTO_PARA_ENTREGA | ENTREGADO_CERRADO | Admin, Recepción |
| DEVOLUCION_SIN_REPARACION | ENTREGADO_CERRADO | Admin, Recepción |

`ENTREGADO_CERRADO` es terminal.

## Estados de pago (independientes del estado de reparación)

`NOT_REQUIRED → PENDING → PROOF_RECEIVED → VALIDATED` · o `REJECTED` (reenvío) · o `CANCELLED`.

Cualquier cambio relevante genera una entrada de historial con actor (usuario interno /
cliente público / sistema), notas visibles e internas separadas.
