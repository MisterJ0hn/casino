# Casino Escolar

Sistema de gestión de casino escolar multi-colegio.

**Stack:** Python 3.12 + FastAPI · PostgreSQL · Angular 21 · Bootstrap 5

---

## Estructura

```
casino_AI/
├── backend/          FastAPI + SQLAlchemy + Alembic
└── frontend/         Angular 18 + Bootstrap 5
```

---

## Backend

### 1. Crear entorno virtual e instalar dependencias

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con los datos reales de conexión
```

### 3. Crear base de datos PostgreSQL

```sql
CREATE DATABASE casino_escolar;
```

### 4. Ejecutar migraciones

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

### 5. Iniciar servidor

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger disponible en: http://localhost:8000/docs

### 6. Tests

```bash
pytest tests/ -v
```

---

## Frontend

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Iniciar servidor de desarrollo

```bash
ng serve
```

Aplicación disponible en: http://localhost:4200

---

## Módulos API

| Módulo | Endpoint base |
|--------|--------------|
| Colegios | `/api/v1/colegios` |
| Alumnos | `/api/v1/alumnos` |
| Apoderados | `/api/v1/apoderados` |
| Consumos | `/api/v1/consumos` |
| Pagos | `/api/v1/pagos` |
| Configuración | `/api/v1/configuracion` |

### Endpoints especiales

- `POST /api/v1/consumos/generar-mensual?anio=2024&mes=4` — genera consumos mensuales
- `POST /api/v1/consumos/import-excel` — importa tickets desde Excel
- `GET  /api/v1/apoderados/{id}/deuda` — deuda total del apoderado
- `GET  /api/v1/apoderados/{id}/portal` — vista completa del portal

---

## Reglas de negocio

1. **Override del alumno** tiene prioridad total sobre configuración del colegio
2. **BECADO / TERMO** → precio siempre $0
3. **MENSUAL** → genera un consumo por cada día hábil del mes
4. **TICKET** → solo se crea desde importación Excel
5. **Pagos FIFO** → se aplican a los consumos más antiguos primero
6. No se modifican consumos históricos
7. Configuración nueva aplica solo hacia futuro
