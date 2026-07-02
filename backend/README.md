# Casino Escolar — Backend

API REST para el sistema de gestión de casino escolar multi-colegio.

**Stack:** Python 3.12 · FastAPI (async) · SQLAlchemy 2.0 (async) · PostgreSQL · Alembic · Celery + Redis

---

## Setup

```bash
python -m venv .venv
source .venv/Scripts/activate   # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
```

Crear `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/casino_escolar
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

```sql
CREATE DATABASE casino_escolar;
```

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Swagger: http://localhost:8000/docs

---

## Estructura

```
app/
├── main.py                  # FastAPI app, CORS, registro de routers
├── core/config.py           # Settings (pydantic-settings, lee .env)
├── db/session.py            # Engine async, AsyncSessionLocal, Base
├── domain/enums.py          # Modalidad, TipoConsumo, OrigenConsumo
├── models/models.py         # Todos los modelos SQLAlchemy
├── api/
│   ├── deps.py              # Dependencia get_db
│   └── v1/                  # Un archivo por recurso (routers)
└── services/
    ├── rule_engine.py       # Lógica de precio/modalidad por alumno
    ├── generacion_mensual.py# Genera consumos por días hábiles
    ├── pago_service.py      # Aplica pagos FIFO
    └── excel_import.py      # Importa tickets desde .xlsx
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/colegios` | Listar colegios |
| GET | `/api/v1/alumnos` | Listar alumnos |
| GET | `/api/v1/apoderados/{id}/deuda` | Deuda total del apoderado |
| GET | `/api/v1/apoderados/{id}/portal` | Vista completa del portal |
| POST | `/api/v1/consumos/generar-mensual?anio=&mes=` | Genera consumos mensuales |
| POST | `/api/v1/consumos/import-excel` | Importa tickets desde Excel |
| POST | `/api/v1/pagos` | Registra un pago (aplica FIFO) |

---

## Servicios

### `ConsumoRuleEngine.resolver(alumno, configuraciones)`

Determina modalidad y precio para un alumno. Prioridad:

1. `Alumno.modalidad_override` (si existe, se usa directamente)
2. `ConfiguracionConsumo` activa que contenga el `nivel` del curso

BECADO y TERMO siempre resultan en precio `$0`.

### `generar_consumos_mensuales(db, anio, mes)`

Para cada alumno activo con modalidad MENSUAL, crea un `Consumo` por cada día hábil (lun–vie) del mes, respetando `DiaSinAlmuerzo`. Es idempotente: no duplica si ya existe el consumo.

### `aplicar_pago(db, apoderado_id, monto, fecha)`

Crea un `Pago` y distribuye el monto entre los consumos no pagados más antiguos primero (FIFO), generando registros `PagoDetalle`. Marca `Consumo.pagado = True` cuando el pendiente queda en $0.

### `importar_excel(db, contenido)`

Lee columnas `RUT` y `FechaHora` / `Fecha` del archivo. Por cada fila válida busca el alumno por RUT, resuelve su precio vía `rule_engine` y crea un consumo de tipo TICKET. Retorna `ImportResult` con conteo de procesados, errores y mensajes.

---

## Excel esperado

Columnas requeridas: `RUT`, `FechaHora` (o `Fecha`).

---

## Tests

```bash
pytest tests/ -v
pytest tests/test_rule_engine.py -v     # solo rule engine
pytest tests/test_generacion_mensual.py -v
```

Los tests usan `unittest.mock.MagicMock` y no requieren base de datos.

---

## Migraciones

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic downgrade -1   # revertir última migración
```
