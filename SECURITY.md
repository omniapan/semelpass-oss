# Security Policy — semelpass-oss

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| < Latest| No        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities via GitHub Issues.**

Email: security@semelpass.com
Subject: [SECURITY] Brief description

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

## What to expect

- Acknowledgement within 48 hours
- Status update within 7 days
- Fix timeline communicated once confirmed
- Credit in release notes (if desired)

## Scope

In scope:
- Authentication bypass
- Session hijacking
- OTP prediction or replay attacks
- HMAC secret exposure
- SQL injection
- XSS / CSRF
- Privilege escalation

Out of scope:
- Attacks requiring physical server access
- Social engineering
- Issues in Juice Shop demo (intentionally vulnerable)
- Rate limiting bypass via IP rotation

## Security baseline

semelpass-oss ships with:
- OWASP ZAP passive scan: 59 PASS / 0 FAIL
- HSTS, CSP, COEP, COOP, X-Frame-Options headers
- Redis-backed rate limiting (silent 202)
- Append-only audit log
- FIPS 140-2/3 cryptographic positioning

## Disclosure policy

We follow responsible disclosure. We ask for 90 days before public
disclosure to allow time for a fix to be developed and deployed.

Copyright 2026 Omniapan, LLC
