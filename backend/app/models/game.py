from datetime import datetime, timezone
from sqlalchemy import BigInteger, Float, Integer, String, CheckConstraint, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class GameRecord(Base):
    __tablename__ = "game_records"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    player_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, default="legacy", index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, nullable=False)
    map_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)
    connection: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    extra_data: Mapped[dict | None] = mapped_column("metadata", JSON, default=None)
    
    __table_args__ = (
        CheckConstraint("score >= 0", name="check_score_positive"),
        CheckConstraint("steps >= 0", name="check_steps_positive"),
        CheckConstraint("mode IN ('ai', 'human')", name="check_mode_valid"),
        CheckConstraint("connection IN ('ws', 'http')", name="check_connection_valid"),
    )
