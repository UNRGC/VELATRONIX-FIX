# Requerimientos (resumen)

Sistema independiente, enlazable desde la landing existente, para gestionar reparaciones de
equipos electrónicos en un negocio de electrónica.

## Alcance incluido

- Consulta pública por **folio + correo** (informacional; la única acción del cliente es
  adjuntar comprobante cuando hay pago activo).
- Generación automática de folios `REP-YYYYMMDD-XXXX`.
- Registro de cliente y equipo; diagnóstico técnico; notas visibles e internas separadas.
- Estados de reparación controlados por backend (enum) con transiciones y permisos por rol.
- Roles: Administrador, Recepción (Empleado), Técnico.
- Solicitudes de pago (transferencia / depósito / efectivo) con instrucciones configurables;
  carga y validación **manual** de comprobantes (sin pagos en línea).
- Notificaciones internas en panel + correos automáticos (SMTP) con registro en `EmailLog`.
- Historial de cambios (público simplificado / interno completo).
- Dockerización completa con base de datos persistente y almacenamiento de comprobantes.

## Fuera de alcance

Pagos en línea, app móvil, inventario, facturación, multi-sucursal.

## Tipos de equipo

PC · Laptop · Impresora · Celular · Tablet · Otro.

## Entidades de datos

`User, Customer, Repair, PaymentRequest, PaymentProof, RepairHistory, Notification, EmailLog,
PaymentSettings` — ver `backend/prisma/schema.prisma`.
