# @crontinel/mcp-server

[![npm version](https://img.shields.io/npm/v/@crontinel/mcp-server)](https://www.npmjs.com/package/@crontinel/mcp-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/crontinel/mcp-server/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/crontinel/mcp-server)](https://github.com/crontinel/mcp-server)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants to [Crontinel](https://crontinel.com), the background job monitoring platform for Laravel. It runs as a local stdio process, proxying tool calls from your AI assistant to the Crontinel REST API.

Ask your AI assistant questions like "Did my cron jobs run last night?" or "What's the queue depth right now?" or "Trigger a redeploy" and get answers inline, without opening a browser.

## Requirements

- Node.js 18+
- A Crontinel account with an API key — get one at [app.crontinel.com/settings](https://app.crontinel.com/settings)

## Installation

```bash
npx -y @crontinel/mcp-server
```

Or install globally:

```bash
npm install -g @crontinel/mcp-server
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crontinel": {
      "command": "npx",
      "args": ["-y", "@crontinel/mcp-server"],
      "env": {
        "CRONTINEL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json` (or use the Claude Code settings UI):

```json
{
  "mcpServers": {
    "crontinel": {
      "command": "npx",
      "args": ["-y", "@crontinel/mcp-server"],
      "env": {
        "CRONTINEL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or the project-level `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "crontinel": {
      "command": "npx",
      "args": ["-y", "@crontinel/mcp-server"],
      "env": {
        "CRONTINEL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.windsurf/settings.json`:

```json
{
  "mcpServers": {
    "crontinel": {
      "command": "npx",
      "args": ["-y", "@crontinel/mcp-server"],
      "env": {
        "CRONTINEL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Continue.dev

Add to `~/.continue/config.json`:

```json
{
  "experimental": {
    "mcpServers": {
      "crontinel": {
        "command": "npx",
        "args": ["-y", "@crontinel/mcp-server"],
        "env": {
          "CRONTINEL_API_KEY": "your-api-key-here"
        }
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CRONTINEL_API_KEY` | Yes | n/a | Your Crontinel API key |
| `CRONTINEL_API_URL` | No | `https://app.crontinel.com` | Override the API base URL (self-hosted or local dev) |

## Available Tools

| Tool | Description |
|---|---|
| `list_scheduled_jobs` | List all monitored cron commands with last run status |
| `get_cron_status` | Last run details for a specific command (exit code, duration, output) |
| `get_queue_status` | Depth, failed count, and wait time for queues |
| `get_horizon_status` | Horizon supervisor health snapshot (status, failed/min) |
| `list_recent_alerts` | Alerts fired in the last N hours |
| `acknowledge_alert` | Dismiss an active alert by its key |
| `create_alert` | Create a new alert channel (Slack, email, or webhook) |

### `list_scheduled_jobs`

List all monitored cron jobs, with their last run status and timing.

**Returns:** Array of job objects with `command`, `last_run_at`, `last_status`, `run_count_today`.

---
### `get_cron_status`

Get the last run result for a specific cron command.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `command` | string | Yes | The cron command string or partial match (e.g. `php artisan inspire` or `send-invoices`) |

**Returns:** `command`, `status`, `exit_code`, `duration_ms`, `started_at`, `finished_at`, `output`.

---
### `get_queue_status`

Get queue depth, failed count, and oldest pending job age.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `queue` | string | No | Specific queue name; omit for all queues |

**Returns:** Array of queue objects with `name`, `depth`, `failed`, `oldest_job_age_seconds`.

---
### `get_horizon_status`

Get a health snapshot of Laravel Horizon: supervisor states, paused/running, failed jobs per minute.

**Returns:** `status` (`running` / `paused` / `inactive`), `failed_jobs_per_minute`, `supervisors` array.

---
### `list_recent_alerts`

List alerts that have fired within the last N hours.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `hours` | number | No | Look-back window in hours (default: 24) |

**Returns:** Array of alert objects with `alert_key`, `state` (`firing` / `resolved`), `fired_at`, `resolved_at`.

---
### `acknowledge_alert`

Dismiss an active alert so it stops notifying.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `alert_key` | string | Yes | Alert key (from `list_recent_alerts`) |

**Returns:** `{ acknowledged: true, alert_key: "..." }` on success.

---
### `create_alert`

Create a new alert channel for an app. Requires a Starter, Pro, or Ultra plan.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | `slack`, `email`, or `webhook` |
| `webhook_url` | string | No | Slack incoming webhook URL (required for `slack`) |
| `to` | string | No | Recipient email address (required for `email`) |
| `url` | string | No | Webhook endpoint URL (required for `webhook`) |

**Returns:** `{ created: true, channel_id: "...", type: "..." }` on success.

---

## How It Works

1. Your AI assistant spawns the MCP server as a local stdio process
2. The server receives JSON-RPC tool calls over stdin
3. It forwards each call as an HTTP request to `app.crontinel.com/api/mcp` with your API key in the `Authorization` header
4. The JSON-RPC response is returned over stdout

All tool definitions are declared locally so your AI can inspect them without a network round-trip.

## Troubleshooting

**`401 Unauthorized`**: Your `CRONTINEL_API_KEY` is missing or invalid. Check that the env var is set in your MCP config, not your shell profile (MCP servers don't inherit your shell environment).

**`404 Not Found` on a tool call**: The `app_slug` doesn't match any app in your account. Copy the slug from the app URL in the Crontinel dashboard (`app.crontinel.com/apps/{slug}`).

**Tools not showing up in Claude/Cursor**: Restart the AI client after updating the MCP config. Most clients only load MCP servers at startup.

**`npx` slow on first run**: `npx -y` downloads the package on first use. Run `npm install -g @crontinel/mcp-server` once to cache it locally, then change `command` to `crontinel-mcp` and remove the `args`.

## Documentation

For the full integration guide, tool reference, and setup walkthroughs:

- [MCP Overview](https://docs.crontinel.com/mcp/overview/)
- [Available Tools Reference](https://docs.crontinel.com/mcp/tools/)
- [Claude Code Setup](https://docs.crontinel.com/mcp/claude-code/)

## Ecosystem

| Package | Description |
|---|---|
| [@crontinel/mcp-server](https://github.com/crontinel/mcp-server) | MCP server for AI assistants (this repo) |
| [crontinel/laravel](https://github.com/crontinel/crontinel) | Laravel package that reports the data this server reads |
| [docs.crontinel.com](https://docs.crontinel.com) | Full documentation |

## License

[MIT](https://github.com/crontinel/mcp-server/blob/main/LICENSE)
