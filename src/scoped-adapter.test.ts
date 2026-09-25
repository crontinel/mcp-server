import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let server: Server;
let url: string;
let revoked = false;
const paths: string[] = [];
const key = 'ct_mcp_fixture_' + 'a'.repeat(64);

beforeAll(async () => {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'pipe' });
  server = createServer(async (request, response) => {
    paths.push(request.url ?? '');
    if (request.method !== 'POST') {
      response.writeHead(405).end();
      return;
    }
    if (revoked || request.headers.authorization !== `Bearer ${key}`) {
      response.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'invalid_token' }));
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    const message = JSON.parse(body);
    if (message.id === undefined) {
      response.writeHead(202).end();
      return;
    }
    let result: unknown;
    if (message.method === 'initialize') {
      result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
    } else if (message.method === 'tools/list') {
      result = { tools: [{ name: 'get_connection', description: 'Fixture', inputSchema: { type: 'object', properties: {} } }] };
    } else if (message.method === 'tools/call') {
      result = { content: [{ type: 'text', text: JSON.stringify({ schema_version: 1, scopes: ['monitor:read'] }) }] };
    } else {
      result = {};
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture address');
  url = `http://127.0.0.1:${address.port}`;
}, 20000);

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

it('uses remote scope-filtered tools and never falls back to legacy authentication after revocation', async () => {
  const client = new Client({ name: 'adapter-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), 'dist/index.js')],
    env: { PATH: process.env.PATH ?? '', CRONTINEL_MCP_KEY: key, CRONTINEL_API_KEY: 'legacy-must-not-be-used', CRONTINEL_API_URL: url }, stderr: 'pipe' });
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(['get_connection']);
    const result = await client.callTool({ name: 'get_connection', arguments: {} });
    expect(result.isError).not.toBe(true);
    revoked = true;
    await expect(client.callTool({ name: 'get_connection', arguments: {} })).rejects.toThrow();
    expect(paths).not.toContain('/api/mcp');
    expect(paths.filter(path => path === '/mcp').length).toBeGreaterThanOrEqual(4);
  } finally {
    await client.close();
  }
}, 20000);
