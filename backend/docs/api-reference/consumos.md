---
title: Consumos
slug: api-consumos
category: Referencia de API
order: 6
---

# Consumos

---

## GET /consumos

Lista consumos con filtros opcionales.

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `alumno_id` | int | Filtra por alumno |
| `anio` | int | Filtra por año |
| `mes` | int | Filtra por mes (requiere `anio`) |

Resultados ordenados por fecha descendente.

**Respuesta 200**

```json
[
  {
    "id": 1001,
    "alumno_id": 5,
    "fecha": "2024-04-01",
    "tipo": "MENSUAL",
    "modalidad": "MENSUAL",
    "precio": "4500.00",
    "precio_base": "4500.00",
    "origen": "AUTOMATICO",
    "pagado": false
  }
]
```

| Campo | Valores posibles |
|-------|-----------------|
| `tipo` | `MENSUAL`, `TICKET` |
| `modalidad` | `MENSUAL`, `TICKET`, `BECADO`, `TERMO` |
| `origen` | `AUTOMATICO` (generación mensual), `EXCEL` (importación) |
| `pagado` | `true` cuando el consumo está completamente saldado |

---

## POST /consumos/generar-mensual

Genera consumos para todos los alumnos activos con modalidad `MENSUAL` en el mes indicado. Es idempotente.

**Query params**

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `anio` | int | Sí |
| `mes` | int (1–12) | Sí |

**Respuesta 200**

```json
{ "mensaje": "Consumos generados: 440 para 4/2024" }
```

**Respuesta 400** — si `mes` está fuera del rango 1–12.

> 📘 Ver [guía de generación mensual](../guides/generate-monthly.md) para el flujo completo.

---

## POST /consumos/import-excel

Importa consumos de tipo `TICKET` desde un archivo Excel.

**Body** — `multipart/form-data`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | file | Archivo `.xlsx` o `.xls` |

**Respuesta 200**

```json
{
  "procesados": 95,
  "errores": 3,
  "mensajes": ["Fila 12: alumno con RUT '...' no encontrado"]
}
```

**Respuesta 400** — si el archivo no es `.xlsx` / `.xls`.

> 📘 Ver [guía de importación Excel](../guides/import-excel.md) para el formato de columnas.
