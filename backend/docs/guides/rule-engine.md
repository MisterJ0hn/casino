---
title: Motor de reglas de consumo
slug: rule-engine
category: Guías
order: 1
---

# Motor de reglas de consumo

El `ConsumoRuleEngine` determina la **modalidad** y el **precio** que corresponde a un alumno antes de crear cualquier consumo. Es invocado tanto en la generación mensual como en la importación Excel.

---

## Prioridad de resolución

```
1. ¿Tiene modalidad_override el alumno?
   → SÍ → Usar override (precio_override si aplica)
   → NO → Buscar ConfiguracionConsumo activa que contenga su nivel
              → No encontrada → retorna None (sin consumo)
```

> ⚠️ **El override del alumno es absoluto**
>
> `modalidad_override` y `precio_override` en el alumno tienen prioridad total sobre cualquier `ConfiguracionConsumo` del colegio, sin excepciones.

---

## Casos especiales

| Modalidad | Precio resultante |
|-----------|-------------------|
| `BECADO`  | Siempre `$0`, independiente de `precio_override` |
| `TERMO`   | Siempre `$0`, independiente de `precio_override` |
| `MENSUAL` | `precio_override` si existe, si no `$0` |
| `TICKET`  | `precio_override` si existe, si no `$0` |

> 📘 **Configuración por niveles**
>
> Si el alumno no tiene override, se busca la primera `ConfiguracionConsumo` activa del colegio donde `nivel_desde ≤ alumno.curso.nivel ≤ nivel_hasta`.

---

## Ejemplo

Colegio con esta configuración:

| nivel_desde | nivel_hasta | modalidad | precio |
|-------------|-------------|-----------|--------|
| 1 | 4 | MENSUAL | $4.500 |
| 5 | 8 | TICKET  | $600   |

- Alumno en nivel 3 → `MENSUAL`, `$4.500`
- Alumno en nivel 7 → `TICKET`, `$600`
- Alumno con `modalidad_override = BECADO` → `BECADO`, `$0` (sin importar el nivel)
- Alumno en nivel 10 → sin coincidencia → **no se genera consumo**
