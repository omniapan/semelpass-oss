import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Boolean, DateTime, Integer,
    ForeignKey, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def new_uuid():
    return str(uuid.uuid4())

# ── Tenants ───────────────────────────────────────────────────────────────────
class Tenant(Base):
    __tablename__ = "tenants"
    id:            Mapped[str]      = mapped_column(String(36),  primary_key=True, default=new_uuid)
    slug:          Mapped[str]      = mapped_column(String(64),  unique=True, nullable=False)
    name:          Mapped[str]      = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active:     Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # ── Stripe billing fields (M4) ────────────────────────────────────────────
    stripe_customer_id:     Mapped[str | None] = mapped_column(String(64), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    subscription_tier:      Mapped[str | None] = mapped_column(String(32), nullable=True)
    billing_cycle:          Mapped[str | None] = mapped_column(String(16), nullable=True)
    subscription_status:    Mapped[str | None] = mapped_column(String(32), nullable=True, default="none")

    apps:  Mapped[list["App"]]  = relationship("App",  back_populates="tenant")
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")

# ── Apps — applications protected by semelpass ────────────────────────────────
class App(Base):
    __tablename__ = "apps"
    id:              Mapped[str]  = mapped_column(String(36),   primary_key=True, default=new_uuid)
    tenant_id:       Mapped[str]  = mapped_column(String(36),   ForeignKey("tenants.id"), nullable=False)
    name:            Mapped[str]  = mapped_column(String(255),  nullable=False)
    slug:            Mapped[str]  = mapped_column(String(64),   nullable=False)
    callback_url:    Mapped[str]  = mapped_column(String(2048), nullable=False)
    allowed_domains: Mapped[str]  = mapped_column(Text,         nullable=False)
    hmac_secret:     Mapped[str]  = mapped_column(String(255),  nullable=False)
    is_active:       Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="apps")
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_app_tenant_slug"),
        Index("ix_apps_tenant_id", "tenant_id"),
    )

# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id:         Mapped[str]      = mapped_column(String(36),  primary_key=True, default=new_uuid)
    tenant_id:  Mapped[str]      = mapped_column(String(36),  ForeignKey("tenants.id"), nullable=False)
    email:      Mapped[str]      = mapped_column(String(255), nullable=False)
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    is_admin:   Mapped[bool]     = mapped_column(Boolean, default=False)
    last_seen:  Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
        Index("ix_users_tenant_id", "tenant_id"),
        Index("ix_users_email",     "email"),
    )

# ── Audit log — immutable, append-only (OWASP A09) ───────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"
    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id:  Mapped[str]      = mapped_column(String(36), nullable=False)
    user_id:    Mapped[str]      = mapped_column(String(36), nullable=True)
    app_id:     Mapped[str]      = mapped_column(String(36), nullable=True)
    event:      Mapped[str]      = mapped_column(String(64), nullable=False)
    ip_address: Mapped[str]      = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str]      = mapped_column(Text,       nullable=True)
    detail:     Mapped[str]      = mapped_column(Text,       nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        Index("ix_audit_tenant_id",  "tenant_id"),
        Index("ix_audit_created_at", "created_at"),
        Index("ix_audit_event",      "event"),
    )

# ── Demo requests ─────────────────────────────────────────────────────────────
class DemoRequest(Base):
    __tablename__ = "demo_requests"
    id:          Mapped[str]      = mapped_column(String(36),  primary_key=True, default=new_uuid)
    name:        Mapped[str]      = mapped_column(String(255), nullable=False)
    email:       Mapped[str]      = mapped_column(String(255), nullable=False)
    company:     Mapped[str]      = mapped_column(String(255), nullable=True)
    use_case:    Mapped[str]      = mapped_column(String(64),  nullable=True)
    status:      Mapped[str]      = mapped_column(String(16),  default="pending")
    ip_address:  Mapped[str]      = mapped_column(String(45),  nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        Index("ix_demo_requests_email",  "email"),
        Index("ix_demo_requests_status", "status"),
    )

# ── Demo allowlist — approved access with TTL ────────────────────────────────
class DemoAllowlist(Base):
    __tablename__ = "demo_allowlist"
    id:         Mapped[str]      = mapped_column(String(36),  primary_key=True, default=new_uuid)
    email:      Mapped[str]      = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        Index("ix_allowlist_email",      "email"),
        Index("ix_allowlist_expires_at", "expires_at"),
    )

# ── OTP Sessions ──────────────────────────────────────────────────────────────
class OTPSession(Base):
    __tablename__ = "otp_sessions"
    id:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id:  Mapped[str]      = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    app_id:     Mapped[str]      = mapped_column(String(36), ForeignKey("apps.id"),    nullable=False)
    email:      Mapped[str]      = mapped_column(String(255), nullable=False)
    code_hash:  Mapped[str]      = mapped_column(String(64),  nullable=False)
    attempts:   Mapped[int]      = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (
        Index("ix_otp_email_app",  "email", "app_id"),
        Index("ix_otp_expires_at", "expires_at"),
        Index("ix_otp_tenant_id",  "tenant_id"),
    )
