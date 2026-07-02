"""add usuario table

Revision ID: b9c1d2e3f4a5
Revises: 22dbb3005b07
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b9c1d2e3f4a5"
down_revision: Union[str, None] = "22dbb3005b07"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuario",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usuario_username", "usuario", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_usuario_username", table_name="usuario")
    op.drop_table("usuario")
