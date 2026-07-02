---
title: Pagos
slug: api-pagos
category: Referencia de API
order: 7
---

# Pagos

---

## POST /pagos

Registra un pago y lo distribuye automáticamente entre los consumos pendientes del apoderado usando FIFO.

**Body**

```json
{
  "apoderado_id": 42,
  "monto": 50000,
  "fecha": "2024-04-30"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `apoderado_id` | int | Sí | ID del apoderado que realiza el pago |
| `monto` | decimal | Sí | Monto abonado |
| `fecha` | date | Sí | Fecha del pago (`YYYY-MM-DD`) |

**Respuesta 201**

```json
{
  "id": 187,
  "apoderado_id": 42,
  "fecha": "2024-04-30",
  "monto": "50000.00"
}
```

> 📘 Ver [guía de pagos](../guides/payments.md) para el algoritmo FIFO y el manejo de pagos parciales.
