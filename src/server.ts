import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MESSAGES, SERVER_NAME, SERVER_VERSION } from "./constants";
import { createNoteStorage } from "./storage";

export async function createServer(): Promise<McpServer> {
  const storage = createNoteStorage();
  await storage.initialize();

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register tools
  server.tool(
    "store_note",
    {
      note: z.string(),
      timestamp: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ note, timestamp, tags }) => {
      const newNote = storage.addNote(note, timestamp, tags);

      return {
        content: [
          {
            type: "text",
            text: MESSAGES.NOTE_STORED(newNote.id, newNote.timestamp),
          },
        ],
      };
    }
  );

  server.tool("retrieve_notes", { query: z.string() }, async ({ query }) => {
    const matches = storage.searchNotes(query);

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: MESSAGES.NO_NOTES_FOUND }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(matches, null, 2),
        },
      ],
    };
  });

  server.tool("delete_note", { id: z.string() }, async ({ id }) => {
    const deleted = storage.deleteNote(id);

    return {
      content: [
        {
          type: "text",
          text: deleted
            ? MESSAGES.NOTE_DELETED(id)
            : MESSAGES.NOTE_NOT_FOUND(id),
        },
      ],
    };
  });

  server.resource("all_notes", "notes://all", async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(storage.getAllNotes(), null, 2),
        },
      ],
    };
  });

  return server;
}
