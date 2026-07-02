---
title: Referencia de API
slug: api-overview
category: Referencia de API
order: 1
---

# Referencia de API

Todos los endpoints tienen el prefijo `/api/v1`.

---

## Recursos

| Recurso | Prefijo | Descripción |
|---------|---------|-------------|
| [Colegios](colegios.md) | `/colegios` | CRUD de establecimientos |
| [Cursos](cursos.md) | `/cursos` | CRUD de cursos por colegio |
| [Alumnos](alumnos.md) | `/alumnos` | CRUD de alumnos (soft delete) |
| [Apoderados](apoderados.md) | `/apoderados` | CRUD + hijos + deuda |
| [Consumos](consumos.md) | `/consumos` | Listado + generación mensual + importación Excel |
| [Pagos](pagos.md) | `/pagos` | Registro de pagos con distribución FIFO |
| [Configuración](configuracion.md) | `/configuracion` | Precios por colegio y rango de nivel |

---

## Convenciones

- Las fechas se envían y reciben en formato `YYYY-MM-DD`.
- Los montos son strings decimales (`"4500.00"`).
- Los endpoints de creación retornan `HTTP 201`.
- Los endpoints de eliminación retornan `HTTP 204` (sin cuerpo).
- Recursos no encontrados retornan `HTTP 404`.

---

## Formatos de error

```json
{
  "detail": "descripción del error"
}
```
