from datetime import datetime, timezone
from sqlalchemy import BigInteger, Integer, String, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class GameRecord(Base):
    __tablename__ = "game_records"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    player_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, nullable=False)
    map_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)
    connection: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    # 扩展字段（JSONB，与迁移脚本一致）
    metadata: Mapped[dict | None] = mapped_column(JSON, default=None)
    
    __table_args__ = (
        CheckConstraint("score >= 0", name="check_score_positive"),
        CheckConstraint("steps >= 0", name="check_steps_positive"),
        CheckConstraint("mode IN ('ai', 'human')", name="check_mode_valid"),
        CheckConstraint("connection IN ('ws', 'http')", name="check_connection_valid"),
    )
