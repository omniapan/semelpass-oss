from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from typing import AsyncGenerator, Dict
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Declarative base — all models inherit from this ───────────────────────────
class Base(DeclarativeBase):
    pass

# ── Engine cache — one engine per DB, reused ──────────────────────────────────
_engines: Dict[str, AsyncEngine] = {}

def _get_engine(url: str) -> AsyncEngine:
    if url not in _engines:
        _engines[url] = create_async_engine(
            url,
            echo=False,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
    return _engines[url]

# ── Master DB — tenants, apps, users, audit_log ───────────────────────────────
def get_master_engine() -> AsyncEngine:
    return _get_engine(settings.master_db_url)

async def get_master_session() -> AsyncGenerator[AsyncSession, None]:
    engine = get_master_engine()
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ── Tenant DB — sessions, otp_events, rate_limit_log ─────────────────────────
def get_tenant_engine(slug: str) -> AsyncEngine:
    return _get_engine(settings.tenant_db_url(slug))

async def get_tenant_session(slug: str) -> AsyncGenerator[AsyncSession, None]:
    engine = get_tenant_engine(slug)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ── Health check — used by /health endpoint ───────────────────────────────────
async def check_master_db() -> bool:
    try:
        engine = get_master_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__('sqlalchemy').text('SELECT 1'))
        return True
    except Exception as e:
        logger.error(f"Master DB health check failed: {e}")
        return False
