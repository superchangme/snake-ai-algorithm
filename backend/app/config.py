from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote_plus
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Database
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "snake_ai"
    database_user: str = "snake_user"
    database_password: str = ""
    ssl_mode: str = "prefer"  # "disable", "allow", "prefer", "require", "verify-full"
    
    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False
    
    @field_validator('database_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError('DATABASE_PASSWORD cannot be empty')
        return v
    
    @property
    def database_url(self) -> str:
        # 使用 URL 编码处理特殊字符
        password = quote_plus(self.database_password)
        return (
            f"postgresql+asyncpg://{self.database_user}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


settings = Settings()
