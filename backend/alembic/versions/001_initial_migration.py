"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("cognitive_profile", postgresql.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("idx_users_email", "users", ["email"])
    
    # Game sessions table
    op.create_table(
        "game_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.String(length=50), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("difficulty_level", sa.Integer(), nullable=False),
        sa.Column("cognitive_area", sa.String(length=50), nullable=False),
        sa.Column("played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_game_sessions_user_id", "game_sessions", ["user_id"])
    op.create_index("idx_game_sessions_played_at", "game_sessions", ["played_at"])
    op.create_index("idx_game_sessions_game_type", "game_sessions", ["game_type"])
    
    # Achievements table
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=False),
        sa.Column("requirement_type", sa.String(length=50), nullable=False),
        sa.Column("requirement_value", sa.Integer(), nullable=False),
        sa.Column("rarity", sa.String(length=20), nullable=False, default="common"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("achievement_id"),
    )
    
    # User achievements table
    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.Integer(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, default=0),
        sa.Column("unlocked", sa.Boolean(), nullable=False, default=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["achievement_id"], ["achievements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "achievement_id", name="uix_user_achievement"),
    )
    
    # Leaderboard table
    op.create_table(
        "leaderboard_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.String(length=50), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),  # daily, weekly, monthly, all_time
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_leaderboard_game_type_period", "leaderboard_entries", ["game_type", "period", "rank"])


def downgrade() -> None:
    op.drop_table("leaderboard_entries")
    op.drop_table("user_achievements")
    op.drop_table("achievements")
    op.drop_table("game_sessions")
    op.drop_table("users")
