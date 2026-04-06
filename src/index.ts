#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.CRONTINEL_API_KEY;
const API_URL = process.env.CRONTINEL_API_URL ?? 'https://app.crontinel.com';

if (!API_KEY) {
  console.error('Error: CRONTINEL_API_KEY environment variable is required');
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
  { name: 'crontinel', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const result = await callCrontinel('tools/call', { name, arguments: args ?? {} });

  return result as { content: Array<{ type: string; text: string }> };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Crontinel MCP server running');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
