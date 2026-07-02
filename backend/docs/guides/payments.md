---
title: Registro de pagos
slug: payments
category: Guías
order: 4
---

# Registro de pagos

Los pagos se registran a nivel de **apoderado** y se distribuyen automáticamente entre sus consumos pendientes usando el algoritmo **FIFO** (los más antiguos primero).

---

## Llamada

```http
POST /api/v1/pagos
Content-Type: application/json

{
  "apoderado_id": 42,
  "monto": 50000,
  "fecha": "2024-04-30"
}
```

**Respuesta 201**

```json
{
  "id": 187,
  "apoderado_id": 42,
  "fecha": "2024-04-30",
  "monto": "50000.00"
}
```

---

## Algoritmo FIFO

```
1. Crear registro Pago
2. Obtener consumos no pagados del apoderado (vía sus hijos), ordenados por fecha ASC
3. Para cada consumo:
   a. Calcular pendiente = precio - sum(PagoDetalle.monto_aplicado)
   b. aplicar = min(saldo_restante, pendiente)
   c. Crear PagoDetalle(pago_id, consumo_id, monto_aplicado=aplicar)
   d. Si pendiente - aplicar ≤ $0.001 → marcar consumo.pagado = True
   e. Restar aplicar del saldo
   f. Si saldo = 0 → detener
4. Commit
```

> 📘 **Pagos parciales**
>
> Un consumo puede quedar parcialmente pagado. En ese caso `consumo.pagado` permanece `False` y el próximo pago continuará donde quedó, gracias a los registros `PagoDetalle`.

---

## Consultar deuda

```http
GET /api/v1/apoderados/{id}/deuda
```

**Respuesta 200**

```json
{
  "apoderado_id": 42,
  "deuda": "12500.00"
}
```

La deuda se calcula como la suma de `(consumo.precio - sum(pago_detalles.monto_aplicado))` para todos los consumos no pagados de los hijos del apoderado.

---

## Consultar consumos del apoderado

```http
GET /api/v1/apoderados/{id}/consumos
```

Retorna todos los consumos de todos sus hijos, ordenados por fecha descendente.

---

> ⚠️ **Consumos históricos**
>
> Los consumos ya registrados nunca se modifican. El precio de un consumo refleja la configuración vigente al momento en que fue creado.
