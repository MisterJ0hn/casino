---
title: Alumnos
slug: api-alumnos
category: Referencia de API
order: 4
---

# Alumnos

---

## GET /alumnos

Lista todos los alumnos activos.

**Respuesta 200**

```json
[
  {
    "id": 1,
    "rut": "12345678-9",
    "nombre": "Juan Pérez",
    "curso_id": 10,
    "activo": true,
    "modalidad_override": null,
    "precio_override": null
  }
]
```

---

## GET /alumnos/{id}

Obtiene un alumno por ID.

**Respuesta 200** — objeto alumno.
**Respuesta 404** — alumno no encontrado.

---

## POST /alumnos

Crea un nuevo alumno.

**Body**

```json
{
  "rut": "12345678-9",
  "nombre": "Juan Pérez",
  "curso_id": 10,
  "activo": true,
  "modalidad_override": null,
  "precio_override": null
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `rut` | string | Sí | Único en el sistema |
| `nombre` | string | Sí | |
| `curso_id` | int | Sí | ID del curso al que pertenece |
| `activo` | bool | No | Default `true` |
| `modalidad_override` | `MENSUAL` \| `TICKET` \| `BECADO` \| `TERMO` \| null | No | Si se especifica, ignora la configuración del colegio |
| `precio_override` | decimal \| null | No | Solo aplica si `modalidad_override` es `MENSUAL` o `TICKET` |

**Respuesta 201** — objeto alumno creado.

---

## PUT /alumnos/{id}

Actualiza un alumno. Acepta los mismos campos que `POST`.

> 📘 **Override individual**
>
> Para aplicar una beca, establece `modalidad_override: "BECADO"`. El precio quedará en `$0` automáticamente.

**Respuesta 200** — objeto actualizado.

---

## DELETE /alumnos/{id}

Soft delete: marca el alumno como `activo = false`. No elimina datos históricos.

**Respuesta 204** — sin cuerpo.
