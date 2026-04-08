# @crontinel/mcp-server

An MCP (Model Context Protocol) server that connects AI assistants to [Crontinel](https://crontinel.com), the background job monitoring SaaS for Laravel applications. It acts as a stdio transport, proxying tool calls from your AI assistant to the Crontinel REST API.

## Requirements

- Node.js 18+
- A Crontinel account with an API key ([app.crontinel.com](https://app.crontinel.com))

## Installation

### Claude Code

Add to `.claude/settings.json`:

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

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CRONTINEL_API_KEY` | Yes | — | Your Crontinel API key |
| `CRONTINEL_API_URL` | No | `https://app.crontinel.com` | Override the API base URL (self-hosted or local dev) |

## Available tools

### `list_scheduled_jobs`

List all monitored cron jobs for an app, with their last run status and timing.

**Example prompts:**
- "Show me all cron jobs for my app"
- "Which cron jobs haven't run today?"
- "List scheduled jobs for my-app"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug from your Crontinel dashboard |

**Returns:** Array of job objects with `command`, `schedule`, `last_run_at`, `last_exit_code`, `last_duration_ms`, `status` (`ok` / `late` / `failing` / `never_ran`).

---

### `get_cron_status`

Get the last run result for a specific cron command.

**Example prompts:**
- "Did the daily cleanup job run successfully?"
- "What was the exit code for the send-emails command?"
- "When did `php artisan queue:prune-batches` last run?"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug |
| `command` | string | Yes | The cron command string (e.g. `php artisan inspire`) |

**Returns:** `command`, `last_run_at`, `exit_code`, `duration_ms`, `output` (last 500 chars of stdout/stderr), `status`.

---

### `get_queue_status`

Get queue depth, failed count, and oldest pending job age.

**Example prompts:**
- "How deep is the default queue?"
- "Are there any failed jobs right now?"
- "Check queue health for my-app"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug |
| `queue` | string | No | Specific queue name — omit for all queues |

**Returns:** Array of queue objects with `name`, `depth`, `failed_count`, `oldest_job_age_seconds`.

---

### `get_horizon_status`

Get a health snapshot of Laravel Horizon: supervisor states, paused/running, failed-jobs-per-minute.

**Example prompts:**
- "Is Horizon running?"
- "Check if Horizon is paused"
- "What's Horizon's failed jobs per minute?"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug |

**Returns:** `status` (`running` / `paused` / `inactive`), `failed_jobs_per_minute`, `supervisors` array with `name`, `status`, `processes`.

---

### `list_recent_alerts`

List alerts that have fired within the last N hours.

**Example prompts:**
- "Any alerts in the last 24 hours?"
- "Show me firing alerts for my-app"
- "What triggered an alert last night?"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug |
| `hours` | number | No | Look-back window in hours (default: 24) |

**Returns:** Array of alert objects with `alert_key`, `state` (`firing` / `resolved`), `fired_at`, `resolved_at`, `message`.

---

### `acknowledge_alert`

Dismiss an active alert so it stops notifying.

**Example prompts:**
- "Acknowledge the queue-depth alert for my-app"
- "Silence the horizon-paused alert"

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `app_slug` | string | Yes | App slug |
| `alert_key` | string | Yes | Alert key (from `list_recent_alerts`) |

**Returns:** `{ acknowledged: true, alert_key: "..." }` on success.

---

## How it works

When your AI assistant invokes a Crontinel tool, this package:

1. Receives the JSON-RPC tool call over stdin
2. Forwards it as an HTTP POST to `https://app.crontinel.com/api/mcp` with your API key in the `Authorization` header
3. Returns the JSON-RPC response back over stdout

All tool definitions are declared locally so your AI can inspect them without a network round-trip.

## Troubleshooting

**`401 Unauthorized`** — Your `CRONTINEL_API_KEY` is missing or invalid. Check the env var is set in your MCP config, not your shell profile (MCP servers don't inherit your shell environment).

**`404 Not Found` on a tool call** — The `app_slug` doesn't match any app in your account. Copy the slug from the app URL in the Crontinel dashboard (`app.crontinel.com/apps/{slug}`).

**Tools not showing up in Claude/Cursor** — Restart the AI client after updating the MCP config. Most clients only load MCP servers at startup.

**`npx` slow on first run** — `npx -y` downloads the package on first use. Run `npm install -g @crontinel/mcp-server` once to cache it locally, then change `command` to `crontinel-mcp` and remove the `args`.

## License

MIT
