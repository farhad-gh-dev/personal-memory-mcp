import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MESSAGES } from "./constants";
import { createServer } from "./server";
import { StorageType } from "./storage";
import { StorageOptions } from "./types";
import { formatError } from "./utils";

/**
 * Personal Memory MCP Server - Main Entry Point
 */
async function main() {
  try {
    // Options are: StorageType.FILE, StorageType.MEMORY, StorageType.SQLITE
    const storageType = StorageType.SQLITE;
    const storageOptions: StorageOptions = {};

    const server = await createServer(storageType, storageOptions);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(MESSAGES.SERVER_STARTED);
  } catch (error) {
    console.error("Failed to start MCP server:", formatError(error));
    process.exit(1);
  }
}

main();
