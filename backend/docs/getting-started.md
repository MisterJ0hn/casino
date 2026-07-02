---
title: Primeros pasos
slug: getting-started
category: Inicio
order: 2
---

# Primeros pasos

## Requisitos

- Python 3.12+
- PostgreSQL 14+
- Redis 7+ (para Celery)

---

## 1. Entorno virtual

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows
# source .venv/bin/activate     # Linux / Mac
pip install -r requirements.txt
```

---

## 2. Variables de entorno

Crea el archivo `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/casino_escolar
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

> 📘 **Driver async**
>
> La URL debe usar el driver `asyncpg` (`postgresql+asyncpg://...`), no `psycopg2`.
> El archivo `alembic.ini` usa `psycopg2` por separado para las migraciones.

---

## 3. Base de datos

```sql
CREATE DATABASE casino_escolar;
```

---

## 4. Migraciones

```bash
alembic upgrade head
```

Para crear una nueva migración tras modificar modelos:

```bash
alembic revision --autogenerate -m "descripcion del cambio"
alembic upgrade head
```

---

## 5. Iniciar el servidor

```bash
uvicorn app.main:app --reload --port 8000
```

| URL | Descripción |
|-----|-------------|
| `http://localhost:8000/docs` | Swagger UI |
| `http://localhost:8000/redoc` | ReDoc |
| `http://localhost:8000/api/v1` | Base de la API |

---

## 6. Tests

```bash
pytest tests/ -v
```

Los tests no requieren base de datos (usan `MagicMock`).

```bash
pytest tests/test_rule_engine.py -v        # motor de reglas
pytest tests/test_generacion_mensual.py -v # generación mensual
```

---

## Próximos pasos

1. Crea un [Colegio](api-reference/colegios.md)
2. Agrega su [Configuración de consumo](api-reference/configuracion.md) (precio por rango de nivel)
3. Crea [Cursos](api-reference/cursos.md) y [Alumnos](api-reference/alumnos.md)
4. [Genera consumos mensuales](guides/generate-monthly.md) o [importa desde Excel](guides/import-excel.md)
5. [Registra pagos](guides/payments.md) de los apoderados
