from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote_plus
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Railway 提供完整的 DATABASE_URL
    database_url: Optional[str] = None
    
    # 分段配置（本地开发用）
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "snake_ai"
    database_user: str = "snake_user"
    database_password: str = ""
    ssl_mode: str = "prefer"
    
    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False
    
    @property
    def db_url(self) -> str:
        """获取数据库连接 URL"""
        # 优先使用 Railway 提供的完整 URL
        if self.database_url:
            # Railway 的 URL 是 postgresql://，需要改为 postgresql+asyncpg://
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        
        # 本地开发：使用分段配置
        password = quote_plus(self.database_password) if self.database_password else ""
        return (
            f"postgresql+asyncpg://{self.database_user}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


settings = Settings()
