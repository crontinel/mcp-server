# @crontinel/mcp-server

[![npm version](https://img.shields.io/npm/v/@crontinel/mcp-server)](https://www.npmjs.com/package/@crontinel/mcp-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/crontinel/mcp-server/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/crontinel/mcp-server)](https://github.com/crontinel/mcp-server)

Connect assistants to Crontinel's monitoring evidence. This package runs as a local stdio adapter. Version 0.3 adds generated MCP keys and fetches the permitted tool list from the hosted server.

## Recommended: remote OAuth

Use `https://app.crontinel.com/mcp` with a remote MCP client. Sign in to Crontinel, select one organization and its apps, then approve read permissions. No key needs to be copied. OAuth runs over HTTP, not stdio.

The initial read tools are `get_connection`, `list_monitors`, `list_runs`, and `list_incidents`. Lists require `app_id` and accept `after_id` and `limit` (maximum 100). They return timestamps and bounded metadata. They don't return job output, command arguments, credentials, or mutation tools.

The September 2026 local acceptance run exercised Codex 0.154.0 OAuth/CIMD plus connection and run reads; Claude Code 2.1.281 OAuth with pre-registration and connection health; and Cursor CLI 2026.08.25-3e8eec8 OAuth with pre-registration and tool discovery. These are local acceptance results, not a claim that every hosted or desktop configuration has been tested.

## Generated-key stdio connection

Create a key in **Settings → AI connections → Use an API key** at [AI connections](https://app.crontinel.com/settings/ai-connections). Choose organization, apps, read scopes and expiry. Save the secret when shown; it cannot be retrieved later.

Pass it to the adapter through `CRONTINEL_MCP_KEY` in your client's environment or secret store. Start `crontinel-mcp` from the installed package. For development, build this checkout and start `node dist/index.js`.

- `CRONTINEL_MCP_KEY`: generated `ct_mcp_...` key. Takes precedence over the legacy variable.
- `CRONTINEL_API_URL`: optional base URL, default `https://app.crontinel.com`. Scoped connections require HTTPS except for local loopback tests.
- The adapter initializes the remote server and forwards its scope-filtered tools. Invalid or revoked scoped keys fail; they never fall back to legacy authentication.
- Rotation and revocation are available in AI connections. Existing running clients must receive the replacement environment value and restart after rotation.

Version 0.3 must be published before using it through `npx @crontinel/mcp-server@0.3.0`. The packaged-artifact acceptance harness is in the workspace at `scripts/test-mcp-adapter.py`.

## Requirements

- Node.js 18+
- A Crontinel account and a generated MCP key from [AI connections](https://app.crontinel.com/settings/ai-connections).

## Installation

```bash
npx -y @crontinel/mcp-server
```

Or install globally:

```bash
npm install -g @crontinel/mcp-server
```

## Legacy app-key configuration

The examples below retain the older `CRONTINEL_API_KEY` path for existing installations. Those app keys use `/api/mcp` and the older tool names. They are not scoped MCP keys. Switching to a generated key changes the advertised tools; migrate prompts to the read-tool names above. A `ct_mcp_` key supplied through the old variable is also recognized as scoped.

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

Use `claude mcp add` for current Claude Code configuration. The JSON below describes the legacy stdio process and environment; it isn't a `settings.json` file:

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

## Legacy app-key tools

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
3. Scoped keys connect to `app.crontinel.com/mcp`; legacy app keys use `app.crontinel.com/api/mcp`. Both use the `Authorization` header.
4. The JSON-RPC response is returned over stdout

Scoped tool definitions come from the authenticated remote server. Legacy tool definitions remain declared locally for compatibility.

## Troubleshooting

**`401 Unauthorized`**: Check key expiry, revocation and current organization membership. Ensure the client actually passes the configured environment to its subprocess. Environment inheritance depends on the client.

**Resource denied**: The selected `app_id` must belong to the fixed organization and app selection in the grant. A dashboard organization switch doesn't change the grant.

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
| [crontinel/laravel](https://github.com/crontinel/laravel) | Laravel package that reports the data this server reads |
| [docs.crontinel.com](https://docs.crontinel.com) | Full documentation |

## License

[MIT](https://github.com/crontinel/mcp-server/blob/main/LICENSE)
