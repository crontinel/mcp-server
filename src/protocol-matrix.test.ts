import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const firstKey = 'ct_mcp_fixture_' + 'a'.repeat(64);
const secondKey = 'ct_mcp_fixture_' + 'b'.repeat(64);
let server: Server;
let url: string;
let slowStarted = false;
let slowCancelled = false;

function tool(name: string) {
  return { name, description: 'Fixture tool', inputSchema: { type: 'object', properties: {} } };
}

beforeAll(async () => {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'pipe' });
  server = createServer(async (request, response) => {
    if (request.method !== 'POST' || ![firstKey, secondKey].some(key => request.headers.authorization === `Bearer ${key}`)) {
      response.writeHead(401).end();
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    const message = JSON.parse(body);
    if (message.id === undefined) {
      if (message.method === 'notifications/cancelled') slowCancelled = true;
      response.writeHead(202).end();
      return;
    }

    const tenant = request.headers.authorization === `Bearer ${firstKey}` ? 'first' : 'second';
    let result: unknown;
    if (message.method === 'initialize') {
      result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
    } else if (message.method === 'tools/list') {
      result = message.params?.cursor === 'page-2'
        ? { tools: [tool(`${tenant}_second`)] }
        : { tools: [tool(`${tenant}_first`)], nextCursor: 'page-2' };
    } else if (message.method === 'tools/call' && message.params?.name === 'slow') {
      slowStarted = true;
      setTimeout(() => {
        if (!response.destroyed) response.writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: tenant }] } }));
      }, 1500);
      return;
    } else if (message.method === 'tools/call') {
      result = message.params?.name?.startsWith(`${tenant}_`)
        ? { content: [{ type: 'text', text: tenant }] }
        : { content: [{ type: 'text', text: 'Tool unavailable' }], isError: true };
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

it('forwards stdio cancellation to the older remote HTTP protocol', async () => {
  slowStarted = false;
  slowCancelled = false;
  const client = await connect(firstKey);
  try {
    const controller = new AbortController();
    const pending = client.callTool({ name: 'slow', arguments: {} }, undefined, { signal: controller.signal });
    for (let tries = 0; !slowStarted && tries < 100; tries++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(slowStarted).toBe(true);
    controller.abort();
    await expect(pending).rejects.toThrow();
    for (let tries = 0; !slowCancelled && tries < 100; tries++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(slowCancelled).toBe(true);
  } finally {
    await client.close();
  }
}, 20000);

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

async function connect(key: string) {
  const client = new Client({ name: 'protocol-matrix', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), 'dist/index.js')],
    env: { PATH: process.env.PATH ?? '', CRONTINEL_MCP_KEY: key, CRONTINEL_API_URL: url }, stderr: 'pipe' }));
  return client;
}

it('forwards scoped tool-list cursors without mixing tenant tool sets', async () => {
  const first = await connect(firstKey);
  const second = await connect(secondKey);
  try {
    expect(await first.listTools()).toMatchObject({ tools: [tool('first_first')], nextCursor: 'page-2' });
    expect(await first.listTools({ cursor: 'page-2' })).toMatchObject({ tools: [tool('first_second')] });
    expect(await second.listTools()).toMatchObject({ tools: [tool('second_first')], nextCursor: 'page-2' });
    expect(await second.listTools({ cursor: 'page-2' })).toMatchObject({ tools: [tool('second_second')] });
    expect((await first.callTool({ name: 'second_first', arguments: {} })).isError).toBe(true);
    expect((await second.callTool({ name: 'first_first', arguments: {} })).isError).toBe(true);
  } finally {
    await first.close();
    await second.close();
  }
}, 20000);
