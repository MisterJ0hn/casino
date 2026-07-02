---
title: Cursos
slug: api-cursos
category: Referencia de API
order: 3
---

# Cursos

---

## GET /cursos

Lista cursos, con filtro opcional por colegio.

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `colegio_id` | int | Filtra por colegio |

**Respuesta 200**

```json
[
  { "id": 10, "colegio_id": 1, "nombre": "1°A", "nivel": 1 },
  { "id": 11, "colegio_id": 1, "nombre": "2°B", "nivel": 2 }
]
```

---

## POST /cursos

Crea un nuevo curso.

**Body**

```json
{
  "colegio_id": 1,
  "nombre": "1°A",
  "nivel": 1
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `colegio_id` | int | Sí | Colegio al que pertenece |
| `nombre` | string | Sí | Nombre del curso |
| `nivel` | int | Sí | Nivel numérico usado para determinar precio |

**Respuesta 201** — objeto curso creado.

> 📘 **Nivel y precio**
>
> El campo `nivel` es el que se compara contra `nivel_desde`/`nivel_hasta` en `ConfiguracionConsumo` para determinar la modalidad y precio del alumno. Ver [motor de reglas](../guides/rule-engine.md).

---

## PUT /cursos/{id}

Actualiza un curso. Acepta los mismos campos que `POST`.

**Respuesta 200** — objeto actualizado.

---

## DELETE /cursos/{id}

Elimina un curso. Solo es posible si no tiene alumnos asociados.

**Respuesta 204** — sin cuerpo.
