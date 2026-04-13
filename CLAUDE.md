# @crontinel/mcp-server — CLAUDE.md

MCP server for querying Crontinel cron/queue monitoring data via the MCP protocol.

## Package
- npm: `@crontinel/mcp-server`
- GitHub: `github.com/crontinel/mcp-server`
- Publish: `npm publish --access public` (CI auto-publishes on git tag push)

## Stack
- TypeScript, Node.js
- MCP SDK (`@modelcontextprotocol/sdk`)

## Key files
- `src/index.ts` — MCP server entry point + tool definitions
- `package.json` — exports, bin (`crontinel-mcp`), scripts
- `dist/` — compiled output (generated on build)
- `SKILL.md` — OpenClaw agent skill (uses `npx -y @crontinel/mcp-server`)

## Commands
```bash
npm install
npm test
npm run typecheck
npm run build   # tsc, makes dist/
```

## Publish
```bash
npm version patch  # bump version
git push origin v<x.y.z>  # push tag → CI publishes
```

## Env vars
- `CRONTINEL_API_KEY` — API key (from app.crontinel.com/settings)
- `CRONTINEL_API_URL` — API URL (default: https://app.crontinel.com)

## MCP Config (Cursor)
```json
{
  "mcpServers": {
    "crontinel": {
      "command": "npx",
      "args": ["-y", "@crontinel/mcp-server"],
      "env": {
        "CRONTINEL_API_KEY": "your_key_here"
      }
    }
  }
}
```
