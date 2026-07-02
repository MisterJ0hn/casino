"""Create an admin user. Run once from the backend/ directory after migration:

    python scripts/create_admin.py [username] [password]

Defaults: admin / admin123
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.models import Usuario
from app.services.auth_service import get_password_hash


async def main(username: str, password: str) -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        existing = await session.execute(select(Usuario).where(Usuario.username == username))
        if existing.scalar_one_or_none():
            print(f"El usuario '{username}' ya existe.")
            await engine.dispose()
            return

        user = Usuario(username=username, password_hash=get_password_hash(password), activo=True)
        session.add(user)
        await session.commit()
        print(f"Usuario '{username}' creado exitosamente.")

    await engine.dispose()


if __name__ == "__main__":
    u = sys.argv[1] if len(sys.argv) > 1 else "admin"
    p = sys.argv[2] if len(sys.argv) > 2 else "admin123"
    asyncio.run(main(u, p))
