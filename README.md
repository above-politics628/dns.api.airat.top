# dns.api.airat.top

![dns](https://repository-images.githubusercontent.com/1191097372/fd9ab937-1028-4266-8bb2-bb04e5e0fc5d)

Public Cloudflare Worker API for DNS lookups via DNS-over-HTTPS (DoH).

Live endpoint: https://dns.api.airat.top
Status page: https://status.airat.top

## API

Required query parameter:
- `name` - hostname to resolve (`example.com`).

Optional query parameter:
- `type` - DNS record type. Default: `A`.
- Supported types: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `SRV`, `CAA`, `PTR`.

### `GET /`

Default endpoint. Returns DNS lookup result as JSON.

```bash
curl 'https://dns.api.airat.top/?name=example.com&type=A'
```

Test in browser: https://dns.api.airat.top/?name=example.com&type=A

Example response:

```json
{
  "ok": true,
  "query": {
    "name": "example.com",
    "type": "A",
    "typeCode": 1
  },
  "dns": {
    "status": 0,
    "statusName": "NOERROR",
    "rd": true,
    "ra": true,
    "ad": false,
    "cd": false,
    "tc": false
  },
  "question": [
    {
      "name": "example.com",
      "type": 1,
      "typeName": "A"
    }
  ],
  "answer": [
    {
      "name": "example.com",
      "type": 1,
      "typeName": "A",
      "ttl": 300,
      "data": "93.184.216.34"
    }
  ],
  "authority": [],
  "comment": null,
  "resolver": "cloudflare-dns.com",
  "service": "dns.api.airat.top",
  "generatedAt": "2026-03-25T00:00:00.000Z"
}
```

### `GET /json`

JSON alias for `/`.

```bash
curl 'https://dns.api.airat.top/json?name=example.com&type=A'
```

Test in browser: https://dns.api.airat.top/json?name=example.com&type=A

### `GET /text`

Returns plain text: one answer per line (or DNS status if no answers).

```bash
curl 'https://dns.api.airat.top/text?name=example.com&type=A'
```

Test in browser: https://dns.api.airat.top/text?name=example.com&type=A

### `GET /yaml`

Returns the same payload as YAML.

```bash
curl 'https://dns.api.airat.top/yaml?name=example.com&type=A'
```

Test in browser: https://dns.api.airat.top/yaml?name=example.com&type=A

### `GET /xml`

Returns the same payload as XML.

```bash
curl 'https://dns.api.airat.top/xml?name=example.com&type=A'
```

Test in browser: https://dns.api.airat.top/xml?name=example.com&type=A

### `GET /health`

Health check endpoint.

```bash
curl 'https://dns.api.airat.top/health'
```

Response:

```json
{
  "status": "ok"
}
```

Test in browser: https://dns.api.airat.top/health

### Validation errors

Missing or invalid `name`/`type` returns `400`:

```bash
curl 'https://dns.api.airat.top/?name=example.com&type=INVALID'
```

```json
{
  "error": "Unsupported type. Use one of: A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, CAA, PTR"
}
```

### CORS

CORS is enabled for all origins (`*`).

## Privacy

No analytics or request logs are collected by this project.

## Project structure

- `worker.js` - Cloudflare Worker script.
- `wrangler.toml` - Wrangler configuration.

## Deployment

Deploy with Wrangler:

```bash
npx wrangler deploy
```

If you use Cloudflare Workers Builds (GitHub integration), keep root directory as `/` and deploy command as `npx wrangler deploy`.

For custom domain binding, configure it in **Workers & Pages -> Domains & Routes**.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE).

---

## Author

**AiratTop**

- Website: [airat.top](https://airat.top)
- GitHub: [@AiratTop](https://github.com/AiratTop)
- Email: [mail@airat.top](mailto:mail@airat.top)
- Repository: [dns.api.airat.top](https://github.com/AiratTop/dns.api.airat.top)
