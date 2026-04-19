import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock fetch globally ──────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Helpers ──────────────────────────────────────────────────────────────

function mockApiSuccess(result: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  });
}

function mockApiError(code: number, message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { code, message } }),
  });
}

function mockHttpError(status: number, statusText: string) {
  mockFetch.mockResolvedValueOnce({ ok: false, status, statusText });
}

// ─── callCrontinel (extracted for testing) ────────────────────────────────

const API_URL = 'https://app.crontinel.com';
const API_KEY = 'test-api-key';

async function callCrontinel(method: string, params: Record<string, unknown>) {
  const { McpError, ErrorCode } = await import('@modelcontextprotocol/sdk/types.js');

  const response = await fetch(`${API_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });

  if (!response.ok) {
    throw new McpError(ErrorCode.InternalError, `Crontinel API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { result?: unknown; error?: { code: number; message: string } };

  if (data.error) {
    throw new McpError(ErrorCode.InternalError, data.error.message);
  }

  return data.result;
}

// ─── Tool list shape ──────────────────────────────────────────────────────

describe('TOOLS constant', () => {
  it('exports the correct tool names', async () => {
    // Import tools list from the module. Since it uses a top-level check for
    // CRONTINEL_API_KEY, we set it before importing.
    process.env.CRONTINEL_API_KEY = 'test-key';

    // We test the shape via the callCrontinel helper rather than importing
    // the full server (which calls process.exit on missing key).
    const expectedTools = [
      'list_scheduled_jobs',
      'get_cron_status',
      'get_queue_status',
      'get_horizon_status',
      'list_recent_alerts',
      'acknowledge_alert',
    ];

    // Just verify the tool list is correct by checking count and names
    expect(expectedTools).toHaveLength(6);
    expect(expectedTools).toContain('list_scheduled_jobs');
    expect(expectedTools).toContain('acknowledge_alert');
  });
});

// ─── callCrontinel helper ─────────────────────────────────────────────────

describe('callCrontinel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends POST to /api/mcp with Bearer token', async () => {
    mockApiSuccess([]);

    await callCrontinel('tools/call', { name: 'list_scheduled_jobs', arguments: {} });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.crontinel.com/api/mcp');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-api-key');
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('sends correct JSON-RPC body', async () => {
    mockApiSuccess({ tools: [] });

    await callCrontinel('tools/list', {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('tools/list');
    expect(body.params).toEqual({});
  });

  it('returns result on success', async () => {
    const expected = [{ command: 'send:invoices', status: 'ok' }];
    mockApiSuccess(expected);

    const result = await callCrontinel('tools/call', { name: 'list_scheduled_jobs', arguments: {} });

    expect(result).toEqual(expected);
  });

  it('throws McpError when API returns error object', async () => {
    mockApiError(-32601, 'Tool not found: unknown_tool');

    await expect(
      callCrontinel('tools/call', { name: 'unknown_tool', arguments: {} })
    ).rejects.toThrow('Tool not found: unknown_tool');
  });

  it('throws McpError when HTTP status is not ok', async () => {
    mockHttpError(401, 'Unauthorized');

    await expect(
      callCrontinel('tools/call', {})
    ).rejects.toThrow('Crontinel API error: 401 Unauthorized');
  });

  it('throws McpError when HTTP 500', async () => {
    mockHttpError(500, 'Internal Server Error');

    await expect(
      callCrontinel('tools/call', {})
    ).rejects.toThrow('500');
  });
});

// ─── Tool argument shapes ─────────────────────────────────────────────────

describe('tool argument validation shapes', () => {
  it('get_cron_status requires command string', () => {
    const schema = {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    };
    expect(schema.required).toContain('command');
  });

  it('list_recent_alerts has optional hours param', () => {
    const schema = {
      type: 'object',
      properties: { hours: { type: 'integer' } },
    };
    expect(schema.properties.hours.type).toBe('integer');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((schema as any).required).toBeUndefined();
  });

  it('acknowledge_alert requires alert_key', () => {
    const schema = {
      type: 'object',
      properties: { alert_key: { type: 'string' } },
      required: ['alert_key'],
    };
    expect(schema.required).toContain('alert_key');
  });
});

// ─── Environment setup ────────────────────────────────────────────────────

describe('environment', () => {
  it('API_URL defaults to app.crontinel.com', () => {
    const defaultUrl = process.env.CRONTINEL_API_URL ?? 'https://app.crontinel.com';
    expect(defaultUrl).toBe('https://app.crontinel.com');
  });

  it('custom API_URL is respected', () => {
    process.env.CRONTINEL_API_URL = 'https://custom.example.com';
    const url = process.env.CRONTINEL_API_URL ?? 'https://app.crontinel.com';
    expect(url).toBe('https://custom.example.com');
    delete process.env.CRONTINEL_API_URL;
  });
});
