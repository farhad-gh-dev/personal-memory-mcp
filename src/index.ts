import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

// Define types
type Note = {
  id: string;
  text: string;
  timestamp: string;
  tags?: string[];
};

// Memory storage service
class NoteStorage {
  private notes: Note[] = [];
  private storageFile: string;

  constructor(storageFilePath?: string) {
    this.storageFile =
      storageFilePath || path.join(process.cwd(), "notes.json");
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      this.notes = JSON.parse(data);
      console.error(`Loaded ${this.notes.length} notes from storage`);
    } catch (error) {
      // File doesn't exist yet or can't be read - start with empty notes
      console.error("Starting with empty notes collection");
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(this.storageFile, JSON.stringify(this.notes, null, 2));
    } catch (error) {
      console.error("Failed to save notes to file:", error);
    }
  }

  addNote(text: string, timestamp?: string, tags?: string[]): Note {
    const newNote: Note = {
      id: this.generateId(),
      text,
      timestamp: timestamp || new Date().toISOString(),
      tags,
    };

    this.notes.push(newNote);
    this.save().catch((err) => console.error("Error saving note:", err));
    return newNote;
  }

  searchNotes(query: string): Note[] {
    return this.notes.filter(
      (note) =>
        note.text.toLowerCase().includes(query.toLowerCase()) ||
        note.tags?.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase())
        )
    );
  }

  getAllNotes(): Note[] {
    return [...this.notes];
  }

  deleteNote(id: string): boolean {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter((note) => note.id !== id);

    if (this.notes.length !== initialLength) {
      this.save().catch((err) =>
        console.error("Error saving after delete:", err)
      );
      return true;
    }

    return false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }
}

// Create and configure MCP server
async function createServer(): Promise<McpServer> {
  const storage = new NoteStorage();
  await storage.initialize();

  const server = new McpServer({
    name: "PersonalMemoryServer",
    version: "1.0.0",
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
            text: `Note stored with ID: ${newNote.id} at ${newNote.timestamp}.`,
          },
        ],
      };
    }
  );

  server.tool("retrieve_notes", { query: z.string() }, async ({ query }) => {
    const matches = storage.searchNotes(query);

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: "No matching notes found." }],
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
            ? `Note with ID ${id} successfully deleted.`
            : `No note with ID ${id} found.`,
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

async function main() {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Personal Memory MCP Server started on stdio.");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
