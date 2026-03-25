// DNS lookup API for Cloudflare Workers.

const SERVICE_NAME = 'dns.api.airat.top';
const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

const SUPPORTED_TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV', 'CAA', 'PTR']);
const TYPE_TO_CODE = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  CAA: 257
};

const CODE_TO_TYPE = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  257: 'CAA'
};

const DNS_STATUS_NAMES = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow'
};

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function normalizeValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return value;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toXml(value, key = 'item', indent = '') {
  if (value === null) {
    return `${indent}<${key} />`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}<${key} />`;
    }

    const rows = value
      .map((entry) => toXml(entry, 'item', `${indent}  `))
      .join('\n');

    return `${indent}<${key}>\n${rows}\n${indent}</${key}>`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return `${indent}<${key} />`;
    }

    const rows = entries
      .map(([childKey, childValue]) => toXml(childValue, childKey, `${indent}  `))
      .join('\n');

    return `${indent}<${key}>\n${rows}\n${indent}</${key}>`;
  }

  return `${indent}<${key}>${xmlEscape(value)}</${key}>`;
}

function xmlResponse(data, status = 200) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(data, 'response')}`;

  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function yamlEscapeString(value) {
  return String(value).replace(/'/g, "''");
}

function toYaml(value, indent = 0) {
  const prefix = '  '.repeat(indent);

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${prefix}[]`;
    }

    return value
      .map((entry) => {
        if (entry === null || typeof entry !== 'object') {
          return `${prefix}- ${toYaml(entry, 0)}`;
        }

        const nested = toYaml(entry, indent + 1);
        const lines = nested.split('\n');
        const firstPrefix = '  '.repeat(indent + 1);
        const firstLine = lines[0].startsWith(firstPrefix)
          ? lines[0].slice(firstPrefix.length)
          : lines[0];
        const rest = lines.slice(1).join('\n');

        return rest ? `${prefix}- ${firstLine}\n${rest}` : `${prefix}- ${firstLine}`;
      })
      .join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return `${prefix}{}`;
    }

    return entries
      .map(([key, child]) => {
        if (Array.isArray(child) && child.length === 0) {
          return `${prefix}${key}: []`;
        }

        if (
          child
          && typeof child === 'object'
          && !Array.isArray(child)
          && Object.keys(child).length === 0
        ) {
          return `${prefix}${key}: {}`;
        }

        if (child === null || typeof child !== 'object') {
          return `${prefix}${key}: ${toYaml(child, 0)}`;
        }

        const nested = toYaml(child, indent + 1);
        return `${prefix}${key}:\n${nested}`;
      })
      .join('\n');
  }

  if (typeof value === 'string') {
    return `'${yamlEscapeString(value)}'`;
  }

  return String(value);
}

function yamlResponse(data, status = 200) {
  return new Response(toYaml(data), {
    status,
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function healthPayload() {
  return { status: 'ok' };
}

function parseType(rawType) {
  const candidate = String(rawType || 'A').trim().toUpperCase();
  if (SUPPORTED_TYPES.has(candidate)) {
    return { ok: true, type: candidate };
  }

  return {
    ok: false,
    error: `Unsupported type. Use one of: ${[...SUPPORTED_TYPES].join(', ')}`
  };
}

function isValidHostname(name) {
  if (!name || name.length > 253) {
    return false;
  }

  const normalized = name.endsWith('.') ? name.slice(0, -1) : name;
  if (!normalized || normalized.includes('..')) {
    return false;
  }

  const labels = normalized.split('.');
  for (const label of labels) {
    if (!label || label.length > 63) {
      return false;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(label)) {
      return false;
    }

    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
  }

  return true;
}

function parseName(rawName) {
  const candidate = String(rawName || '').trim();
  if (!candidate) {
    return {
      ok: false,
      error: 'Missing name parameter. Example: ?name=example.com&type=A'
    };
  }

  if (!isValidHostname(candidate)) {
    return {
      ok: false,
      error: 'Invalid name parameter. Use a valid hostname (example: example.com).'
    };
  }

  return { ok: true, name: candidate };
}

function mapRecord(record) {
  const numericType = Number(record?.type);

  return {
    name: normalizeValue(record?.name),
    type: Number.isNaN(numericType) ? null : numericType,
    typeName: normalizeValue(CODE_TO_TYPE[numericType] || null),
    ttl: normalizeValue(record?.TTL ?? null),
    data: normalizeValue(record?.data)
  };
}

function mapQuestion(question) {
  const numericType = Number(question?.type);

  return {
    name: normalizeValue(question?.name),
    type: Number.isNaN(numericType) ? null : numericType,
    typeName: normalizeValue(CODE_TO_TYPE[numericType] || null)
  };
}

function renderText(payload) {
  if (payload.answer.length > 0) {
    return payload.answer
      .map((item) => item.data)
      .filter(Boolean)
      .join('\n');
  }

  if (payload.dns.statusName) {
    return `DNS ${payload.dns.statusName}`;
  }

  return '';
}

async function performLookup(name, type) {
  const dnsUrl = new URL(DOH_ENDPOINT);
  dnsUrl.searchParams.set('name', name);
  dnsUrl.searchParams.set('type', type);

  let response;
  try {
    response = await fetch(dnsUrl.toString(), {
      headers: {
        Accept: 'application/dns-json'
      }
    });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `DNS lookup failed: ${error?.message || 'network error'}`
    };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'Failed to parse DNS resolver response.'
    };
  }

  const statusCode = Number(body?.Status ?? 0);

  return {
    ok: true,
    payload: {
      ok: statusCode === 0,
      query: {
        name,
        type,
        typeCode: TYPE_TO_CODE[type] || null
      },
      dns: {
        status: statusCode,
        statusName: normalizeValue(DNS_STATUS_NAMES[statusCode] || 'UNKNOWN'),
        rd: Boolean(body?.RD),
        ra: Boolean(body?.RA),
        ad: Boolean(body?.AD),
        cd: Boolean(body?.CD),
        tc: Boolean(body?.TC)
      },
      question: Array.isArray(body?.Question) ? body.Question.map(mapQuestion) : [],
      answer: Array.isArray(body?.Answer) ? body.Answer.map(mapRecord) : [],
      authority: Array.isArray(body?.Authority) ? body.Authority.map(mapRecord) : [],
      comment: normalizeValue(body?.Comment),
      resolver: 'cloudflare-dns.com',
      service: SERVICE_NAME,
      generatedAt: new Date().toISOString()
    }
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return textResponse('Method Not Allowed', 405);
    }

    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (path === '/robots.txt') {
      return textResponse('User-agent: *\nDisallow: /\n');
    }

    if (path === '/health') {
      return jsonResponse(healthPayload());
    }

    const allowedPaths = new Set(['/', '/json', '/text', '/yaml', '/xml']);
    if (!allowedPaths.has(path)) {
      return textResponse('Not Found', 404);
    }

    const nameResult = parseName(url.searchParams.get('name'));
    if (!nameResult.ok) {
      return jsonResponse({ error: nameResult.error }, 400);
    }

    const typeResult = parseType(url.searchParams.get('type'));
    if (!typeResult.ok) {
      return jsonResponse({ error: typeResult.error }, 400);
    }

    const lookupResult = await performLookup(nameResult.name, typeResult.type);
    if (!lookupResult.ok) {
      return jsonResponse({ error: lookupResult.error }, lookupResult.status || 502);
    }

    const payload = lookupResult.payload;

    if (path === '/text') {
      return textResponse(renderText(payload));
    }

    if (path === '/yaml') {
      return yamlResponse(payload);
    }

    if (path === '/xml') {
      return xmlResponse(payload);
    }

    return jsonResponse(payload);
  }
};
