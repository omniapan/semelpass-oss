from pydantic_settings import BaseSettings
from pydantic import EmailStr
from functools import lru_cache
from typing import List

class Settings(BaseSettings):

    # ── App ───────────────────────────────────────────────────────────────────
    app_env:              str   = "development"
    app_host:             str   = "0.0.0.0"
    app_port:             int   = 8000
    base_url:             str   = "http://localhost:8000"
    app_version:          str   = "26.05.1.0"
    allowed_origins:      str   = "http://localhost:3000"

    # ── Database ──────────────────────────────────────────────────────────────
    postgres_db:          str
    postgres_user:        str
    postgres_password:    str

    @property
    def master_db_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:"
            f"{self.postgres_password}@semelpass-postgres:5432/"
            f"{self.postgres_db}_master"
        )

    def tenant_db_url(self, slug: str) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:"
            f"{self.postgres_password}@semelpass-postgres:5432/"
            f"{self.postgres_db}_tenant_{slug}"
        )

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_password:       str
    redis_url:            str = "redis://semelpass-redis:6379/0"

    @property
    def redis_full_url(self) -> str:
        return f"redis://:{self.redis_password}@semelpass-redis:6379/0"

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret:                str
    jwt_algorithm:             str  = "HS256"
    jwt_access_expire_minutes: int  = 15
    jwt_refresh_expire_days:   int  = 7

    # ── Encryption ────────────────────────────────────────────────────────────
    fernet_key:           str

    # ── HMAC — service to service ─────────────────────────────────────────────
    hmac_secret:          str

    # ── Mail ──────────────────────────────────────────────────────────────────
    mail_from:            str   = "welcome@semelpass.com"
    mail_from_name:       str   = "semelpass"
    smtp_host:            str   = "semelpass-postfix"
    smtp_port:            int   = 25

    # ── OTP ───────────────────────────────────────────────────────────────────
    otp_length:                int = 6
    otp_expire_minutes:        int = 10
    otp_max_attempts:          int = 5
    magic_link_expire_minutes: int = 15

    # ── Rate limiting — token bucket ──────────────────────────────────────────
    rate_bucket_capacity:  int = 10
    rate_refill_seconds:   int = 20

    # ── Admin ─────────────────────────────────────────────────────────────────
    admin_email:          str   = ""

    # ── Demo / Juice Shop ─────────────────────────────────────────────────────
    juice_demo_email:     str   = "admin@juice-sh.op"
    juice_demo_password:  str   = "admin123"

    # ── Stripe ────────────────────────────────────────────────────────────────
    stripe_secret_key:                str = ""
    stripe_publishable_key:           str = ""
    stripe_webhook_secret:            str = ""
    stripe_semelpass_product_id:      str = ""

    # Self-hosted commercial license prices
    stripe_price_self_hosted_monthly: str = ""
    stripe_price_self_hosted_annual:  str = ""
    stripe_price_self_hosted_2year:   str = ""
    stripe_price_self_hosted_3year:   str = ""

    # Managed hosting prices (semelpass.com runs it)
    stripe_price_managed_monthly:     str = ""
    stripe_price_managed_annual:      str = ""
    stripe_price_managed_2year:       str = ""
    stripe_price_managed_3year:       str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
