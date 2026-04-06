# @crontinel/mcp-server

An MCP (Model Context Protocol) server that connects AI assistants to [Crontinel](https://crontinel.com), the background job monitoring SaaS for Laravel applications. It acts as a stdio transport, proxying tool calls from your AI assistant to the Crontinel API.

## Requirements

- Node.js 18+
- A Crontinel account with an API key ([app.crontinel.com](https://app.crontinel.com))

## Installation

### Claude Code

Add to your `.claude/settings.json` (or the Claude Code MCP config):

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

Add to your Cursor MCP configuration (`~/.cursor/mcp.json` or the project-level `.cursor/mcp.json`):

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
| `CRONTINEL_API_URL` | No | `https://app.crontinel.com` | Override the API base URL (for self-hosted or testing) |

## Available tools

| Tool | Description |
|---|---|
| `list_scheduled_jobs` | List all monitored cron commands with their last run status and timing |
| `get_cron_status` | Get the last run status, exit code, and duration for a specific cron command |
| `get_queue_status` | Get queue depth, failed job count, and oldest job age for all queues or a specific queue |
| `get_horizon_status` | Get a snapshot of Laravel Horizon health: supervisor states, paused status, failed jobs per minute |
| `list_recent_alerts` | List alerts that have fired in the last N hours |
| `acknowledge_alert` | Dismiss an active alert by its alert key |

## How it works

When your AI assistant invokes a Crontinel tool, this package:

1. Receives the JSON-RPC tool call over stdin
2. Forwards it as an HTTP POST to `https://app.crontinel.com/api/mcp` with your API key in the `Authorization` header
3. Returns the JSON-RPC response back over stdout

All tool definitions are declared locally so your AI assistant can inspect them without a network round-trip.

## License

MIT
