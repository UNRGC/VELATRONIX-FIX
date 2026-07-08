# Flujos y verificación end-to-end

## Flujo principal (con pago)

1. **Recepción** — Recepción/Admin crea la reparación (cliente + equipo + falla). El sistema
   genera folio `REP-YYYYMMDD-XXXX`, envía correo al cliente. Estado: `EN_ESPERA_REVISION`.
2. **Diagnóstico** — Técnico/Admin captura diagnóstico, notas visibles/internas e indica si
   requiere pago. Si requiere pago → se crea solicitud y pasa a `EN_ESPERA_PAGO` (+correo).
3. **Pago** — El cliente consulta con folio+correo/teléfono, ve los datos bancarios y sube comprobante.
   Estado: `PAGO_EN_VALIDACION`. Se crea notificación interna y correo (cliente + interno).
4. **Validación** — Admin/Recepción valida el comprobante → `EN_PROCESO_REPARACION` (+correo). Si lo
   rechaza con motivo → vuelve a `EN_ESPERA_PAGO` y el cliente puede reenviar.
5. **Reparación** — Técnico/Admin marca `REPARACION_REALIZADA` con notas del técnico.
6. **Listo y entrega** — Técnico/Admin marca `LISTO_PARA_ENTREGA`; al entregar, Admin/Recepción marca
   `ENTREGADO_CERRADO`.

## Flujo sin pago

En el diagnóstico se deja "no requiere pago" → `DIAGNOSTICADO`. Admin o técnico asignado puede mover
a `EN_PROCESO_REPARACION` y seguir el flujo técnico.

## Devolución sin reparación

Admin marca `DEVOLUCION_SIN_REPARACION` capturando motivo/acuerdo (nota visible). El cliente
ve que puede recoger el equipo sin reparación. Luego se cierra con `ENTREGADO_CERRADO`.

## Checklist de aceptación

- [ ] `docker compose up` levanta postgres + backend + frontend + mailpit.
- [ ] Login como admin; el admin crea empleados y técnicos.
- [ ] Recepción crea reparación → folio único → correo (visible en Mailpit :8025).
- [ ] Cliente consulta con folio+correo/teléfono; **falla** solo con folio o con contacto incorrecto (error genérico).
- [ ] Cliente ve estado, equipo, diagnóstico y notas visibles; **no** ve notas internas.
- [ ] Técnico captura diagnóstico; con pago → `EN_ESPERA_PAGO` con datos bancarios visibles.
- [ ] Cliente sube comprobante (PDF/imagen); un `.exe` es rechazado; >5 MB rechazado.
- [ ] Panel muestra notificación / pago pendiente; Admin/Recepción valida → `EN_PROCESO_REPARACION` + correo.
- [ ] Admin/Recepción rechaza comprobante con motivo → cliente puede reenviar.
- [ ] Técnico solo ve reparaciones asignadas y no ve/descarga comprobantes.
- [ ] Técnico marca realizada y listo para entrega; Admin/Recepción cierra entregado.
- [ ] Todos los cambios quedan en historial; contraseñas cifradas; comprobante solo para Admin/Recepción autenticados.
- [ ] Reiniciar contenedores: datos y archivos persisten.
