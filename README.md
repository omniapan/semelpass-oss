# semelpass-oss

**Solid. Secure. Sovereign.**

Self-hosted, open-source passwordless authentication built on email OTP.
No passwords. No third-party SaaS in your auth chain. Your data never leaves your environment.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![ZAP Scan](https://img.shields.io/badge/ZAP-59%20PASS%20%7C%200%20FAIL%20%7C%208%20WARN-brightgreen)](zap-reports/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com/r/omniapan/semelpass-oss-backend)

---

## What is semelpass?

semelpass-oss eliminates passwords entirely. Users authenticate via a one-time code
sent to their email — or a magic link, or a TOTP authenticator app. No password
database to breach. No credential stuffing. No resets.

It runs entirely on your infrastructure. You own the data. You own the keys.
That is what **Sovereign** means.

```
semelpass-oss (free):   Solid · Secure · Sovereign
semelpass commercial:   Solid · Secure · Sovereign · Supported
```

---

## Features

### Free (AGPL v3)

| Feature | Status |
|---------|--------|
| Email OTP authentication | ✅ |
| Magic link authentication | ✅ |
| TOTP (authenticator app) | ✅ |
| Caddy `forward_auth` integration | ✅ |
| JWT sessions | ✅ |
| Multi-app support | ✅ |
| Audit log | ✅ |
| React embed component | ✅ |
| Admin UI | ✅ |
| Tenant self-service portal | ✅ |
| Self-hostable, air-gap friendly | ✅ |

### Commercial

Everything in free, plus:

| Feature | Status |
|---------|--------|
| Passkey / WebAuthn | ✅ |
| SAML 2.0 / SSO | ✅ |
| Extended audit log (SOC 2-ready) | ✅ |
| Anomaly detection | ✅ |
| White label | ✅ |
| Multi-region sessions | ✅ |
| Air-gapped deploy + support contract | ✅ |
| SLA + dedicated support | ✅ |
| semelpass Cloud (managed hosting) | ✅ |
| Multi-tenant enhancements | ✅ |

See [COMMERCIAL.md](COMMERCIAL.md) for licensing and pricing.

---

## Why email OTP?

- **NIST SP 800-63B** deprecated SMS as a recommended authenticator. SS7 vulnerabilities
  and SIM-swap attacks make SMS a liability, not a feature.
- Email OTP on a smartphone **is** the second factor — clean, free, and defensible.
- Email OTP satisfies **CMMC IA.L2-3.5.3** MFA requirements. Full stop.
- Sovereign email delivery means no third-party SaaS touches your auth flow.

---

## Quick Start

```bash
git clone https://github.com/omniapan/semelpass-oss.git
cd semelpass-oss
bash setup.sh
```

`setup.sh` will:
1. Detect your environment
2. Generate all required secrets
3. Write `.env` from `.env.example`
4. Start the stack with `docker compose up -d`
5. Run a health check

**Requirements:** Docker 24+, Docker Compose V2, a domain with DNS pointed at your server.

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │          Your Domain             │
                    │     (semelpass.yourdomain.com)   │
                    └────────────────┬────────────────┘
                                     │ HTTPS
                    ┌────────────────▼────────────────┐
                    │           Caddy Proxy            │
                    │   TLS termination · forward_auth │
                    └──────┬──────────────┬───────────┘
                           │              │
             ┌─────────────▼──┐    ┌──────▼──────────┐
             │   Your App(s)  │    │  semelpass API   │
             │  (any service) │    │  FastAPI · async │
             └────────────────┘    └──────┬───────────┘
                                          │
                              ┌───────────▼───────────┐
                              │       PostgreSQL       │
                              │   semelpass_master DB  │
                              └───────────────────────┘
```

All components run in Docker on your hardware. Nothing leaves your environment.

---

## Stack

```
semelpass-caddy     caddy:2-alpine        TLS · reverse proxy · forward_auth
semelpass-backend   semelpass-oss         FastAPI application (async)
semelpass-postgres  postgres:16-alpine    Primary database
semelpass-redis     redis:7-alpine        Session store · rate limiting
semelpass-postfix   semelpass-postfix     Outbound email delivery
```

6 containers. One `docker compose up -d`. That's it.

---

## Configuration

Copy `.env.example` to `.env` and fill in your values, or run `setup.sh` which
handles this interactively.

```bash
cp .env.example .env
# Edit .env with your domain, SMTP settings, and generated secrets
docker compose up -d
```

See `.env.example` for all required and optional variables with descriptions.

---

## Caddy `forward_auth` Integration

Protect any service on your stack with a single Caddy directive:

```caddyfile
your-app.yourdomain.com {
    forward_auth semelpass-backend:8000 {
        uri /v1/auth/verify
        copy_headers X-Tenant-ID X-User-Email X-Session-ID
    }
    reverse_proxy your-app:8080
}
```

Users hitting your app are redirected to semelpass for authentication.
On success, identity headers are forwarded to your app. Zero code changes required.

---

## Security

semelpass-oss is built with security as the primary constraint, not an afterthought.

- All sessions are short-lived, cryptographically signed tokens
- OTP codes are hashed at rest — plaintext never stored
- Rate limiting on all authentication endpoints (silent 202 — never reveals state)
- Secure cookies: `HttpOnly`, `Secure`, `SameSite=Lax`
- Content Security Policy, COEP, COOP headers enforced
- ZAP baseline scan: **59 PASS / 0 FAIL / 8 WARN**

See [SECURITY.md](SECURITY.md) for vulnerability disclosure and our security policy.

---

## Compliance

semelpass-oss satisfies **CMMC IA.L2-3.5.3** multi-factor authentication requirements
using sovereign email OTP — no third-party SaaS dependency, fully auditable,
deployable in air-gapped environments.

| Control | Satisfied By |
|---------|-------------|
| CMMC IA.L2-3.5.3 (MFA) | Email OTP — second factor via sovereign email delivery |
| Audit logging | Tamper-evident audit log, all auth events captured |
| Session management | Short-lived signed tokens, explicit logout |
| Credential storage | No passwords stored. Ever. |

---

## License

semelpass-oss is licensed under the **GNU Affero General Public License v3.0 (AGPL v3)**.

The AGPL v3 ensures that if you use semelpass-oss to provide a service to others
(SaaS), you must release your modifications under the same license.

If you need to use semelpass-oss in a proprietary product or managed service
**without** the AGPL obligation, a commercial license is available.

See [LICENSE](LICENSE) and [COMMERCIAL.md](COMMERCIAL.md).

---

## Contributing

We welcome contributions. Please read [CLA.md](CLA.md) before submitting your
first pull request. A signed CLA is required before any PR is merged.

Bug reports, feature requests, and security disclosures: see [SECURITY.md](SECURITY.md).

---

## Commercial

**semelpass commercial** adds Passkey/WebAuthn, SAML 2.0/SSO, extended audit,
anomaly detection, white label, multi-region, SLA, and managed hosting.

**Solid. Secure. Sovereign. Supported.**

[semelpass.com](https://semelpass.com) — self-hosted license and managed hosting.

---

*Built by [Omniapan](https://omniapan.ai) · Solid · Secure · Sovereign*
