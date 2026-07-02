---
title: Introducción
slug: introduction
category: Inicio
order: 1
---

# Casino Escolar API

Sistema de gestión de casino escolar multi-colegio. Administra alumnos, consumos, pagos y configuración de precios para múltiples establecimientos educacionales.

---

## ¿Qué puedes hacer con esta API?

- Gestionar colegios, cursos y alumnos
- Generar consumos mensuales automáticamente por días hábiles
- Importar tickets de consumo desde archivos Excel
- Registrar pagos de apoderados con distribución FIFO
- Consultar deuda consolidada por apoderado

---

## Base URL

```
http://localhost:8000/api/v1
```

> 📘 **Documentación interactiva**
>
> Swagger UI disponible en `http://localhost:8000/docs`
> ReDoc disponible en `http://localhost:8000/redoc`

---

## Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| **Colegio** | Establecimiento educacional. Tiene configuración de precios por rango de nivel. |
| **Curso** | Pertenece a un colegio. Tiene un `nivel` numérico que determina el precio aplicable. |
| **Alumno** | Pertenece a un curso. Puede tener un override individual de modalidad y precio. |
| **Apoderado** | Responsable de pago. Puede tener múltiples hijos (alumnos). |
| **Consumo** | Registro de almuerzo de un alumno en una fecha. Puede ser `MENSUAL` o `TICKET`. |
| **Pago** | Monto abonado por un apoderado, distribuido automáticamente entre sus consumos pendientes. |

---

## Modalidades

| Modalidad | Descripción | Precio |
|-----------|-------------|--------|
| `MENSUAL` | Se genera un consumo por cada día hábil del mes | Según configuración |
| `TICKET`  | Solo se crea mediante importación Excel | Según configuración |
| `BECADO`  | Alumno becado | Siempre $0 |
| `TERMO`   | Alumno con colación propia | Siempre $0 |

---

## Navegación

- [Primeros pasos](getting-started.md) — Configurar el entorno y ejecutar la API
- **Guías** — Flujos de negocio: generación mensual, importación Excel, pagos
- **Referencia de API** — Todos los endpoints con parámetros y ejemplos
