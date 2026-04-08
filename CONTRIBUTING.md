# Contributing to crontinel/mcp-server

The Crontinel MCP server exposes monitoring data to AI assistants via the Model Context Protocol. Contributions are welcome.

## Getting started

```bash
git clone https://github.com/crontinel/mcp-server.git
cd mcp-server
npm install
npm run build
```

Test that the server starts:

```bash
node dist/index.js --help
```

## How to submit changes

1. Fork and create a branch from `main`: `git checkout -b fix/your-fix-name`
2. Make your changes. If adding a new MCP tool, add tests in `src/__tests__/`.
3. Run `npm test` to confirm tests pass.
4. Run `npm run build` to confirm the TypeScript compiles cleanly.
5. Open a pull request against `main` describing what changed and why.

## Code style

TypeScript with standard ESLint config. Run the linter before committing:

```bash
npm run lint
```

## Adding a new MCP tool

Each tool lives in `src/tools/`. Follow the existing pattern: export a `name`, `description`, `inputSchema`, and `execute` function. Register the tool in `src/index.ts`.

Document the new tool in `docs/mcp/tools.md` (in the `crontinel/docs` repo).

## Reporting issues

Open a GitHub issue with:
- What you expected
- What happened instead
- Steps to reproduce
- Node.js version and OS
