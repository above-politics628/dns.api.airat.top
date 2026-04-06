# AGENTS.md

## Purpose
Public DNS lookup API via DNS-over-HTTPS for `dns.api.airat.top`.

## Repository Role
- Category: `*.api.airat.top` (public API project).
- Deployment platform: Cloudflare Workers.
- Main files: `worker.js`, `wrangler.toml`.

## API Summary
- Live endpoint: `https://dns.api.airat.top`.
- Status page: `https://status.airat.top`.
- Required param: `name`.
- Optional param: `type` (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `SRV`, `CAA`, `PTR`).
- Routes: `/`, `/json`, `/text`, `/yaml`, `/xml`, `/health`.

## AI Working Notes
- Keep response format compatibility across all route aliases.
- Keep validation behavior for missing/invalid `name` and unsupported `type`.
- Keep CORS enabled and health endpoint stable.
