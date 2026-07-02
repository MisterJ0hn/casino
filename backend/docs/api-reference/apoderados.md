---
title: Apoderados
slug: api-apoderados
category: Referencia de API
order: 5
---

# Apoderados

---

## GET /apoderados

Lista todos los apoderados.

**Respuesta 200**

```json
[
  { "id": 1, "rut": "98765432-1", "nombre": "María González", "email": "maria@ejemplo.cl" }
]
```

---

## GET /apoderados/{id}

Obtiene un apoderado por ID.

**Respuesta 404** — apoderado no encontrado.

---

## POST /apoderados

Crea un nuevo apoderado.

**Body**

```json
{
  "rut": "98765432-1",
  "nombre": "María González",
  "email": "maria@ejemplo.cl"
}
```

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `rut` | string | Sí |
| `nombre` | string | Sí |
| `email` | string | Sí |

**Respuesta 201** — objeto apoderado creado.

---

## PUT /apoderados/{id}

Actualiza un apoderado. Acepta los mismos campos que `POST`.

---

## GET /apoderados/{id}/hijos

Lista los alumnos vinculados al apoderado.

**Respuesta 200** — lista de objetos alumno.

---

## POST /apoderados/{id}/hijos

Vincula un alumno al apoderado.

**Body**

```json
{ "alumno_id": 5 }
```

**Respuesta 201** — objeto `AlumnoApoderado`.
**Respuesta 409** — el alumno ya está vinculado.

---

## DELETE /apoderados/{id}/hijos/{alumno_id}

Desvincula un alumno del apoderado.

**Respuesta 204** — sin cuerpo.
**Respuesta 404** — vínculo no encontrado.

---

## GET /apoderados/{id}/deuda

Retorna la deuda total del apoderado: suma de consumos no pagados de todos sus hijos, descontando abonos parciales.

**Respuesta 200**

```json
{
  "apoderado_id": 1,
  "deuda": "12500.00"
}
```

---

## GET /apoderados/{id}/consumos

Lista todos los consumos de los hijos del apoderado, ordenados por fecha descendente.

**Respuesta 200** — lista de objetos consumo. Ver [Consumos](consumos.md) para el formato.
