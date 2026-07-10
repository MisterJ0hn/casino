"""es_principal en alumno_apoderado y alumno_id en pago (pago dirigido)

Revision ID: d5a1e2f3c4b6
Revises: b304c77dd19f
Create Date: 2026-07-10 02:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5a1e2f3c4b6'
down_revision: Union[str, None] = 'b304c77dd19f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Flag de apoderado principal por vínculo alumno-apoderado.
    op.add_column(
        'alumno_apoderado',
        sa.Column('es_principal', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Backfill: marcar como principal un único vínculo existente por alumno
    # (el de menor id, que corresponde al primer apoderado cargado).
    op.execute(
        """
        UPDATE alumno_apoderado aa
        SET es_principal = true
        WHERE aa.id = (
            SELECT MIN(x.id) FROM alumno_apoderado x
            WHERE x.alumno_id = aa.alumno_id
        )
        """
    )

    # Pago dirigido a un alumno puntual (nullable = comportamiento actual).
    op.add_column(
        'pago',
        sa.Column('alumno_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_pago_alumno_id', 'pago', 'alumno', ['alumno_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_pago_alumno_id', 'pago', type_='foreignkey')
    op.drop_column('pago', 'alumno_id')
    op.drop_column('alumno_apoderado', 'es_principal')
