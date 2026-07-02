---
title: Generación de consumos mensuales
slug: generate-monthly
category: Guías
order: 2
---

# Generación de consumos mensuales

El endpoint `POST /consumos/generar-mensual` recorre todos los alumnos activos con modalidad `MENSUAL` y crea un `Consumo` por cada día hábil del mes indicado.

---

## Cuándo ejecutarlo

Al inicio de cada mes, antes de que los apoderados puedan ver sus consumos. El proceso es **idempotente**: si se ejecuta más de una vez para el mismo mes, no duplica consumos ya existentes.

---

## Qué cuenta como día hábil

Lunes a viernes. El sistema **no** incluye feriados por defecto; para excluir días específicos se utilizan registros `DiaSinAlmuerzo`.

> 📘 **DiaSinAlmuerzo**
>
> Permite excluir días a distintos niveles de granularidad:
> - Sin `colegio_id`, `curso_id` ni `alumno_id` → excluye ese día para **todos**
> - Con `colegio_id` → excluye solo para alumnos de ese colegio
> - Con `curso_id` → excluye solo para alumnos de ese curso
> - Con `alumno_id` → excluye solo para ese alumno

---

## Llamada

```http
POST /api/v1/consumos/generar-mensual?anio=2024&mes=4
```

**Parámetros query**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `anio`    | int  | Sí | Año (ej. `2024`) |
| `mes`     | int  | Sí | Mes 1–12 |

**Respuesta 200**

```json
{
  "mensaje": "Consumos generados: 440 para 4/2024"
}
```

> ⚠️ **Solo genera para modalidad MENSUAL**
>
> Los alumnos con modalidad `TICKET`, `BECADO` o `TERMO` son ignorados en este proceso.

---

## Flujo interno

```
1. Cargar todos los alumnos activos
2. Cargar ConfiguracionConsumo activas
3. Cargar DiaSinAlmuerzo del mes
4. Para cada alumno:
   a. Resolver modalidad con ConsumoRuleEngine
   b. Si no es MENSUAL → saltar
   c. Para cada día hábil:
      - Si es DiaSinAlmuerzo para ese alumno → saltar
      - Si ya existe el consumo → saltar (idempotencia)
      - Crear Consumo (origen=AUTOMATICO)
5. Commit
```
