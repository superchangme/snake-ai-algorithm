from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Database
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "snake_ai"
    database_user: str = "snake_user"
    database_password: str = ""
    
    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False
    
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


settings = Settings()
