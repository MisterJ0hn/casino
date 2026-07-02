from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse

from app.api.deps import get_current_user
from app.api.v1 import alumnos, apoderados, auth, colegios, configuracion, consumos, cursos, dias_sin_almuerzo, pagos

app = FastAPI(
    title="Casino Escolar API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/redoc", include_in_schema=False, response_class=HTMLResponse)
async def redoc():
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="Casino Escolar API - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js",
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
_auth_dep = [Depends(get_current_user)]

# Ruta pública
app.include_router(auth.router, prefix=API_PREFIX)

# Rutas protegidas
app.include_router(colegios.router,        prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(cursos.router,          prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(alumnos.router,         prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(apoderados.router,      prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(consumos.router,        prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(pagos.router,           prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(configuracion.router,   prefix=API_PREFIX, dependencies=_auth_dep)
app.include_router(dias_sin_almuerzo.router, prefix=API_PREFIX, dependencies=_auth_dep)


@app.get("/")
def root():
    return {"message": "Casino Escolar API", "docs": "/docs"}
