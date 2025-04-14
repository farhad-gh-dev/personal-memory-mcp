import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "PersonalMemoryServer",
  version: "1.0.0",
});

// In-memory storage for personal notes
type Note = {
  text: string;
  timestamp: string;
};
const personalNotes: Note[] = [];

server.tool(
  "store_note",
  { note: z.string(), timestamp: z.string().optional() },
  async ({ note, timestamp }) => {
    const ts = timestamp || new Date().toISOString();
    personalNotes.push({ text: note, timestamp: ts });
    return {
      content: [{ type: "text", text: `Note stored at ${ts}.` }],
    };
  }
);

server.tool("retrieve_notes", { query: z.string() }, async ({ query }) => {
  const matches = personalNotes.filter((note) =>
    note.text.toLowerCase().includes(query.toLowerCase())
  );
  if (matches.length === 0) {
    return {
      content: [{ type: "text", text: "No matching notes found." }],
    };
  }
  // Format the matching notes as a JSON string.
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(matches, null, 2),
      },
    ],
  };
});

server.resource(
  "all_notes",
  "notes://all", // You can use a static URI here.
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(personalNotes, null, 2),
        },
      ],
    };
  }
);

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Personal Memory MCP Server started on stdio.");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
