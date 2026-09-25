#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.CRONTINEL_MCP_KEY ?? process.env.CRONTINEL_API_KEY;
const API_URL = process.env.CRONTINEL_API_URL ?? 'https://app.crontinel.com';
const scoped = process.env.CRONTINEL_MCP_KEY !== undefined || API_KEY?.startsWith('ct_mcp_');
const remote = new Client({ name: 'crontinel-stdio-adapter', version: '0.3.0' });

if (!API_KEY) {
  console.error('Error: CRONTINEL_MCP_KEY is required (CRONTINEL_API_KEY remains supported for legacy clients)');
  process.exit(1);
}

const TOOLS = [
  {
    name: 'list_scheduled_jobs',
    description: 'List all monitored cron commands with their last run status and timing',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_cron_status',
    description: 'Get the last run status, exit code, and duration for a specific cron command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command name or partial match (e.g. "send-invoices")' },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_queue_status',
    description: 'Get queue depth, failed job count, and oldest job age for all queues or a specific queue',
    inputSchema: {
      type: 'object',
      properties: {
        queue: { type: 'string', description: 'Queue name (optional — returns all queues if omitted)' },
      },
    },
  },
  {
    name: 'get_horizon_status',
    description: 'Get a snapshot of Laravel Horizon health: supervisor states, paused status, failed jobs per minute',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_recent_alerts',
    description: 'List alerts that have fired in the last N hours',
    inputSchema: {
      type: 'object',
      properties: {
        hours: { type: 'integer', description: 'Look-back window in hours (default: 24)' },
      },
    },
  },
  {
    name: 'acknowledge_alert',
    description: 'Dismiss an active alert by its alert key',
    inputSchema: {
      type: 'object',
      properties: {
        alert_key: { type: 'string', description: 'Alert key to dismiss (e.g. "horizon:paused", "queue:emails:depth")' },
      },
      required: ['alert_key'],
    },
  },
  {
    name: 'create_alert',
    description: 'Create a new alert channel (slack, email, or webhook) for the app',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['slack', 'email', 'webhook'], description: 'Alert channel type' },
        webhook_url: { type: 'string', description: 'Slack incoming webhook URL (required when type=slack)' },
        to: { type: 'string', description: 'Recipient email address (required when type=email)' },
        url: { type: 'string', description: 'Webhook endpoint URL (required when type=webhook)' },
      },
      required: ['type'],
    },
  },
];

async function callCrontinel(method: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${API_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
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

const server = new Server(
  { name: 'crontinel', version: '0.3.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => scoped ? remote.listTools() : ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (scoped) {
    return await remote.callTool({ name, arguments: args ?? {} });
  }

  const result = await callCrontinel('tools/call', { name, arguments: args ?? {} });

  return result as { content: Array<{ type: string; text: string }> };
});

async function main() {
  if (scoped) {
    if (!API_KEY?.startsWith('ct_mcp_')) {
      throw new Error('CRONTINEL_MCP_KEY must be a generated MCP key');
    }
    const endpoint = new URL(`${API_URL.replace(/\/$/, '')}/mcp`);
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) {
      throw new Error('Use HTTPS, or HTTP loopback for local tests');
    }
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error('Endpoint must not contain credentials, query parameters or fragments');
    }
    await remote.connect(new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${API_KEY}` }, redirect: 'error' },
    }));
  } else {
    console.error('Legacy app-key mode: migrate to CRONTINEL_MCP_KEY for scoped, read-only tools.');
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Crontinel MCP server running');
}

main().catch(() => {
  console.error('Connection failed. Check the endpoint, credential type, expiry and permissions.');
  process.exit(1);
});
