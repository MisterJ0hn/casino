---
title: Configuración de consumo
slug: api-configuracion
category: Referencia de API
order: 8
---

# Configuración de consumo

Define la modalidad y el precio del almuerzo según el rango de nivel de los alumnos de un colegio.

---

## GET /configuracion

Lista todas las configuraciones activas.

**Respuesta 200**

```json
[
  {
    "id": 5,
    "colegio_id": 1,
    "nivel_desde": 1,
    "nivel_hasta": 4,
    "modalidad": "MENSUAL",
    "precio": "4500.00",
    "activo": true
  },
  {
    "id": 6,
    "colegio_id": 1,
    "nivel_desde": 5,
    "nivel_hasta": 8,
    "modalidad": "TICKET",
    "precio": "600.00",
    "activo": true
  }
]
```

---

## POST /configuracion

Crea una nueva configuración.

**Body**

```json
{
  "colegio_id": 1,
  "nivel_desde": 1,
  "nivel_hasta": 4,
  "modalidad": "MENSUAL",
  "precio": "4500.00",
  "activo": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `colegio_id` | int | Sí | Colegio al que aplica |
| `nivel_desde` | int | Sí | Nivel mínimo (inclusivo) |
| `nivel_hasta` | int | Sí | Nivel máximo (inclusivo) |
| `modalidad` | `MENSUAL` \| `TICKET` \| `BECADO` \| `TERMO` | Sí | |
| `precio` | decimal | Sí | Precio por consumo |
| `activo` | bool | No | Default `true` |

**Respuesta 201** — objeto configuración creada.

> ⚠️ **La nueva configuración aplica solo hacia futuro**
>
> Los consumos ya generados conservan el precio con el que fueron creados. Cambiar la configuración no modifica consumos históricos.

---

## DELETE /configuracion/{id}

Elimina una configuración.

**Respuesta 204** — sin cuerpo.

---

> 📘 Ver [motor de reglas](../guides/rule-engine.md) para entender cómo se selecciona la configuración aplicable a cada alumno.
