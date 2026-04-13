---
name: crontinel
description: Query Laravel cron, queue, and Horizon monitoring data from Crontinel. Use when the user asks about cron job status, queue depth, failed jobs, Horizon health, or alert history for a Laravel application monitored by Crontinel. Requires CRONTINEL_API_KEY and CRONTINEL_API_URL environment variables.
metadata:
  {
    openclaw:
      {
        emoji: "⏰",
        requires:
          {
            bins: ["node"],
            env: ["CRONTINEL_API_KEY", "CRONTINEL_API_URL"],
          },
      },
  }
---

# Crontinel

Query Laravel cron, queue, and Horizon monitoring data via the Crontinel MCP API.

## When to use (trigger phrases)

Use this skill immediately when the user asks any of:

- "check cron status"
- "any failed jobs?"
- "is Horizon running?"
- "how did the nightly cron run?"
- "queue depth"
- "recent alerts"
- "dismiss alert"
- "crontinel"
- anything about Laravel scheduler or queue health

## Prerequisites

The skill requires:

- `CRONTINEL_API_KEY` environment variable set (get from app.crontinel.com/settings)
- `CRONTINEL_API_URL` environment variable (defaults to `https://app.crontinel.com` for SaaS)
- Node.js available as `node`

## Tools

All tools use `npx -y @crontinel/mcp-server -- <command>` behind the scenes.

### `crontinel list_scheduled_jobs`
List all monitored cron commands with their last run status.

**Example trigger:** "list all cron jobs and their status"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- list_scheduled_jobs
```

### `crontinel get_cron_status <command>`
Get last run status for a specific cron command.

**Example trigger:** "how did the reports:generate cron job do?"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- get_cron_status "reports:generate"
```

### `crontinel get_queue_status [queue]`
Get queue depth and failed job count for all queues or a named queue.

**Example trigger:** "check the emails queue depth"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- get_queue_status emails
```

### `crontinel get_horizon_status`
Get Laravel Horizon health snapshot — supervisor states, paused status, failed jobs per minute.

**Example trigger:** "is Horizon healthy?"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- get_horizon_status
```

### `crontinel list_recent_alerts [hours]`
List alerts fired in the last N hours (default: 24).

**Example trigger:** "any alerts in the last 6 hours?"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- list_recent_alerts 6
```

### `crontinel acknowledge_alert <alert_key>`
Dismiss an active alert by its key.

**Example trigger:** "acknowledge the queue:emails:depth alert"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- acknowledge_alert "queue:emails:depth"
```

### `crontinel create_alert <type> [--webhook_url <url>|--to <email>|--url <url>]`
Create an alert channel (Slack, email, or webhook).

**Example trigger:** "add a Slack alert channel"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- create_alert slack --webhook_url "https://hooks.slack.com/services/XXX"
```

### `crontinel ping`
Quick connectivity check — confirms Crontinel API is reachable with the current credentials.

**Example trigger:** "is Crontinel configured correctly?"

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- ping
```

## Setup

Before first use, set your API credentials:

```bash
export CRONTINEL_API_KEY="your_api_key_here"
export CRONTINEL_API_URL="https://app.crontinel.com"  # or your self-hosted URL
```

Find your API key at: https://app.crontinel.com/settings/api

## Quick check

Verify everything works:

```bash
CRONTINEL_API_KEY="$CRONTINEL_API_KEY" CRONTINEL_API_URL="$CRONTINEL_API_URL" npx -y @crontinel/mcp-server -- ping
# Should return: {"ok":true}
```
