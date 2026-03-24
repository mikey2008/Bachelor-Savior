# Security Policy — Bachelor Savior

## Architecture

Bachelor Savior follows a **secure client-side + backend proxy architecture**:

- ✅ Express Backend Proxy for AI requests
- ✅ No direct Gemini API calls from the client (for proxying)
- ✅ JWT-based authentication for recipe management
- ✅ No sensitive secrets stored in the browser (moved to server env)


---

## Secret Storage

The Gemini API key is now stored **only on the backend server** as an environment variable (`GEMINI_API_KEY`).

| Where | Value |
|---|---|
| Backend Environment | Gemini API key (Server-only) |
| `localStorage.accessToken` | User's JWT session token (device-only) |
| Source code / git | ❌ Never |
| Network requests | Client calls `/api/ai/generate` → Backend calls Gemini |


**For developers**: Never hard-code or commit API keys. The `.gitignore` blocks `*.env`, `secrets.*`, and similar files. Run `git log --all --full-history -- "*.env"` periodically to confirm no secrets leaked into git history.

---

## HTTPS Enforcement

Deployed via Netlify or Vercel, HTTPS is enforced by:

1. **`_headers` / `vercel.json`** — sets `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
2. Once HSTS is active, browsers will refuse plain HTTP connections to this domain for 1 year
3. Submit the domain to the [HSTS preload list](https://hstspreload.org) for maximum coverage

Verify your headers after deployment: [securityheaders.com](https://securityheaders.com)

---

## Content Security Policy

A strict CSP is enforced both via `<meta>` tag (fallback) and HTTP response header (primary):

- Scripts: only from `self` + pinned `cdn.jsdelivr.net`
- Connections: only to `generativelanguage.googleapis.com`
- Frames: `frame-ancestors 'none'` — cannot be embedded in iframes
- All HTTP sub-resources are auto-upgraded to HTTPS (`upgrade-insecure-requests`)

---

## Security Logging

The app includes a built-in **client-side `SecurityLogger`**. All events are written to the browser console and stored in `sessionStorage` under the key `security_log`.

To view logs during a session, open DevTools Console and run:

```js
JSON.parse(sessionStorage.getItem('security_log') || '[]')
```

### Event Types

| Event | Trigger | Severity |
|---|---|---|
| `AUTH_ERROR` | API key missing or rejected (401/403) | HIGH |
| `API_ERROR` | Non-OK response from Gemini API | MEDIUM |
| `RATE_LIMIT` | Cook button pressed before cooldown expires | LOW |
| `UNUSUAL_TRAFFIC` | >3 API calls within 60 seconds | HIGH |

---

---

## Abuse Protection

The application implements several layers of defense to prevent scraping and API misuse:

1.  **Server-Side Proxy:** All AI requests are routed through `/api/ai/generate`. This hides the API key and enforces server-side rate limits.
2.  **Rate Limiting:**
    -   **Backend:** Authenticated users are limited to a fair-use quota (e.g., 30 requests per minute).
    -   **Frontend:** Cooldown logic on the "Cook Magic" button prevents rapid repeated clicks.
3.  **Bot Mitigation:**
    -   `robots.txt` denies all crawlers.
    -   `X-Robots-Tag: noindex, nofollow` header is set on all pages.
4.  **reCAPTCHA:** Integrated Google reCAPTCHA v2 (placeholder installed) to verify human interaction before expensive AI generation calls.

---

## Responsible Disclosure


This is an open-source hobby project. If you discover a security vulnerability, please open a [GitHub Issue](https://github.com/mikey2008/Bachelor-Savior/issues) marked `[SECURITY]` or contact the maintainer directly via GitHub.

Please allow reasonable time to respond before any public disclosure.
