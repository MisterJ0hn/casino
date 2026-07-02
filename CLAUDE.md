# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Python 3.12 + FastAPI (async) + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL
- **Frontend:** Angular 21 + Bootstrap 5 + Bootstrap Icons
- **Background tasks:** Celery + Redis (broker + result backend)

## Commands

### Backend (run from `backend/`)

```bash
# Setup
python -m venv .venv
source .venv/Scripts/activate   # Windows
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload --port 8000

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head

# Tests
pytest tests/ -v
pytest tests/test_rule_engine.py -v   # single test file
```

### Frontend (run from `frontend/`)

```bash
npm install
ng serve          # dev server → http://localhost:4200
ng build          # production build
ng test           # Karma/Jasmine tests
```

## Architecture

### Backend

All API routes live in `backend/app/api/v1/` (one file per resource). Routes depend on:
- `app/db/session.py` — async SQLAlchemy engine + `AsyncSessionLocal`; `get_db()` is the FastAPI dependency
- `app/api/deps.py` — re-exports `get_db` as the injectable dependency
- `app/models/models.py` — all SQLAlchemy models in one file
- `app/domain/enums.py` — `Modalidad`, `TipoConsumo`, `OrigenConsumo` enums shared by models, schemas, and services
- `app/core/config.py` — pydantic-settings; reads `DATABASE_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` from `.env`

Business logic is isolated in `app/services/`:
- `rule_engine.py` — `ConsumoRuleEngine.resolver()` determines modalidad + precio for an alumno; alumno-level override always wins over colegio config
- `generacion_mensual.py` — generates one `Consumo` per business day for all MENSUAL students
- `pago_service.py` — FIFO payment application; creates `PagoDetalle` rows to partially/fully pay consumos oldest-first
- `excel_import.py` — processes uploaded `.xlsx` to create TICKET consumos

### Data Model

```
Colegio → Curso → Alumno ←→ Apoderado (many-to-many via AlumnoApoderado)
                     ↓
                  Consumo ← PagoDetalle → Pago → Apoderado
ConfiguracionConsumo → Colegio (price/modalidad by nivel range)
DiaSinAlmuerzo (excludes days at colegio/curso/alumno granularity)
```

`Alumno.modalidad_override` / `precio_override` bypass `ConfiguracionConsumo` entirely. BECADO and TERMO always result in precio $0.

### Frontend

Single `ApiService` (`frontend/src/app/core/api.service.ts`) handles all HTTP calls; types are defined in `frontend/src/app/core/models.ts`. All routes use standalone lazy-loaded components under `frontend/src/app/modules/admin/` (one folder per resource) plus `modules/apoderado/portal/` for the parent-facing portal.

`environment.apiUrl` points to `http://localhost:8000/api/v1`.

### `src/` directory

Contains an unrelated .NET/C# project (`CasinoEscolar.API`, `.Application`, `.Domain`, `.Infrastructure`) — not used by the active Python/Angular stack.

## Business Rules

1. Alumno override → highest priority (beats colegio config)
2. BECADO / TERMO → precio always $0
3. MENSUAL → one consumo per business day, generated in batch
4. TICKET → only created via Excel import
5. Pagos apply FIFO (oldest consumo first); partial payments tracked in `PagoDetalle`
6. Historical consumos are never modified
7. New `ConfiguracionConsumo` applies only going forward
