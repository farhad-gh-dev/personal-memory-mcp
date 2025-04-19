import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MESSAGES } from "./constants";
import { createServer } from "./server";
import { formatError } from "./utils";

/**
 * Personal Memory MCP Server - Main Entry Point
 */
async function main() {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(MESSAGES.SERVER_STARTED);
  } catch (error) {
    console.error("Failed to start MCP server:", formatError(error));
    process.exit(1);
  }
}

main();
