---
title: Importación de tickets Excel
slug: import-excel
category: Guías
order: 3
---

# Importación de tickets Excel

El endpoint `POST /consumos/import-excel` procesa un archivo `.xlsx` o `.xls` y crea consumos de tipo `TICKET` para cada fila válida.

---

## Formato del archivo

El archivo debe contener al menos estas columnas (el orden no importa):

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `RUT` | string | RUT del alumno (debe existir en la BD y estar activo) |
| `FechaHora` o `Fecha` | fecha/datetime | Fecha del consumo |

> 📘 **Nombres de columna**
>
> Los espacios al inicio y final de los nombres de columna se eliminan automáticamente.
> Si existe `FechaHora`, tiene precedencia sobre `Fecha`.

---

## Llamada

```http
POST /api/v1/consumos/import-excel
Content-Type: multipart/form-data

file: <archivo.xlsx>
```

**Respuesta 200**

```json
{
  "procesados": 95,
  "errores": 3,
  "mensajes": [
    "Fila 12: alumno con RUT '12.345.678-9' no encontrado",
    "Fila 34: consumo duplicado para RUT 98765432-1 en 2024-04-15",
    "Fila 67: Fecha vacía"
  ]
}
```

---

## Validaciones por fila

| Condición | Resultado |
|-----------|-----------|
| `RUT` vacío | Error, continúa con la siguiente fila |
| `Fecha` ausente | Error, continúa con la siguiente fila |
| Alumno no encontrado o inactivo | Error |
| Consumo TICKET duplicado (mismo RUT + fecha) | Mensaje informativo, no cuenta como error |
| Sin configuración de precio para el alumno | Error |
| Excepción inesperada en la fila | Error con mensaje |

> ⚠️ **Archivos permitidos**
>
> Solo se aceptan extensiones `.xlsx` y `.xls`. Otros formatos retornan HTTP 400.

---

## Precio aplicado

El precio del ticket se calcula con el mismo [motor de reglas](rule-engine.md) que la generación mensual: override del alumno primero, luego configuración del colegio por nivel.
