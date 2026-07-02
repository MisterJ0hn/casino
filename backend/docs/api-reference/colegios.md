---
title: Colegios
slug: api-colegios
category: Referencia de API
order: 2
---

# Colegios

---

## GET /colegios

Lista todos los colegios.

**Respuesta 200**

```json
[
  { "id": 1, "nombre": "Colegio San Martín", "activo": true },
  { "id": 2, "nombre": "Escuela Los Andes", "activo": true }
]
```

---

## POST /colegios

Crea un nuevo colegio.

**Body**

```json
{
  "nombre": "Colegio San Martín",
  "activo": true
}
```

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| `nombre` | string | Sí | — |
| `activo` | bool | No | `true` |

**Respuesta 201**

```json
{ "id": 3, "nombre": "Colegio San Martín", "activo": true }
```

---

## PUT /colegios/{id}

Actualiza un colegio existente. Acepta los mismos campos que `POST`.

**Respuesta 200** — objeto actualizado.

---

## GET /colegios/{id}/cursos

Lista los cursos del colegio.

**Respuesta 200**

```json
[
  { "id": 10, "colegio_id": 1, "nombre": "1°A", "nivel": 1 },
  { "id": 11, "colegio_id": 1, "nombre": "2°B", "nivel": 2 }
]
```

---

## GET /colegios/{id}/configuracion

Lista las configuraciones de consumo activas del colegio.

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
  }
]
```
