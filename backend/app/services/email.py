import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

settings = get_settings()


def _send_smtp(to_email: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    """Synchronous SMTP send — called via asyncio.to_thread."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    msg["To"] = to_email

    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.sendmail(settings.mail_from, [to_email], msg.as_string())


async def send_email(to_email: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    """Async wrapper — runs SMTP send in thread pool to avoid blocking event loop."""
    await asyncio.to_thread(_send_smtp, to_email, subject, body_text, body_html)


async def send_otp_email(to_email: str, otp_code: str) -> None:
    """Send OTP verification email."""
    subject = "Your semelpass verification code"
    body_text = (
        f"Your verification code is: {otp_code}\n\n"
        f"This code expires in {settings.otp_expire_minutes} minutes.\n"
        f"If you did not request this, please ignore this email."
    )
    body_html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Your verification code</h2>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">{otp_code}</p>
        <p style="color: #555;">This code expires in {settings.otp_expire_minutes} minutes.</p>
        <p style="color: #999; font-size: 12px;">If you did not request this, ignore this email.</p>
    </div>
    """
    await send_email(to_email, subject, body_text, body_html)
