import * as fs from "fs/promises";
import { STORAGE_FILE_PATH, SQLITE_DB_PATH } from "./constants";
import { Note, NoteStorage, StorageOptions } from "./types";
import { generateUniqueId, safeJsonParse } from "./utils";

let Database: any;
try {
  Database = require("better-sqlite3");
} catch (err) {
  console.error("SQLite support requires better-sqlite3 package");
}

export function createFileNoteStorage(
  filePath: string = STORAGE_FILE_PATH
): NoteStorage {
  let notes: Note[] = [];

  const save = async (): Promise<void> => {
    try {
      await fs.writeFile(filePath, JSON.stringify(notes, null, 2));
    } catch (error) {
      console.error("Failed to save notes to file:", error);
    }
  };

  return {
    initialize: async (): Promise<void> => {
      try {
        const data = await fs.readFile(filePath, "utf-8");
        const parsedNotes = safeJsonParse<Note[]>(data);
        if (parsedNotes) {
          notes = parsedNotes;
          console.error(`Loaded ${notes.length} notes from storage`);
        }
      } catch (error) {
        console.error("Starting with empty notes collection");
      }
    },

    addNote: (text: string, timestamp?: string, tags?: string[]): Note => {
      const newNote: Note = {
        id: generateUniqueId(),
        text,
        timestamp: timestamp || new Date().toISOString(),
        tags,
      };

      notes.push(newNote);
      save().catch((err) => console.error("Error saving note:", err));
      return newNote;
    },

    searchNotes: (query: string): Note[] => {
      return notes.filter(
        (note) =>
          note.text.toLowerCase().includes(query.toLowerCase()) ||
          note.tags?.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
      );
    },

    getAllNotes: (): Note[] => {
      return [...notes];
    },

    deleteNote: (id: string): boolean => {
      const initialLength = notes.length;
      notes = notes.filter((note) => note.id !== id);

      if (notes.length !== initialLength) {
        save().catch((err) => console.error("Error saving after delete:", err));
        return true;
      }

      return false;
    },
  };
}

export function createInMemoryNoteStorage(): NoteStorage {
  let notes: Note[] = [];

  return {
    initialize: async (): Promise<void> => {
      console.error("Initialized in-memory storage");
    },

    addNote: (text: string, timestamp?: string, tags?: string[]): Note => {
      const newNote: Note = {
        id: generateUniqueId(),
        text,
        timestamp: timestamp || new Date().toISOString(),
        tags,
      };

      notes.push(newNote);
      return newNote;
    },

    searchNotes: (query: string): Note[] => {
      return notes.filter(
        (note) =>
          note.text.toLowerCase().includes(query.toLowerCase()) ||
          note.tags?.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
      );
    },

    getAllNotes: (): Note[] => {
      return [...notes];
    },

    deleteNote: (id: string): boolean => {
      const initialLength = notes.length;
      notes = notes.filter((note) => note.id !== id);
      return notes.length !== initialLength;
    },
  };
}

export function createSqliteNoteStorage(
  dbPath: string = SQLITE_DB_PATH
): NoteStorage {
  if (!Database) {
    throw new Error(
      "SQLite storage requires better-sqlite3 package. Please install it using: npm install better-sqlite3"
    );
  }

  let notesCache: Note[] = [];
  let db: any;

  const initDb = () => {
    if (!db) {
      db = new Database(dbPath);

      db.prepare(
        `
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          tags TEXT
        )
      `
      ).run();
    }
  };

  // Convert row from DB to Note object
  const rowToNote = (row: any): Note => {
    return {
      id: row.id,
      text: row.text,
      timestamp: row.timestamp,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    };
  };

  // Load all notes from DB to cache
  const refreshCache = (): void => {
    try {
      initDb(); // Ensure DB is initialized before querying
      const rows = db.prepare("SELECT * FROM notes").all();
      notesCache = rows.map(rowToNote);
    } catch (error) {
      console.error("Failed to refresh notes cache:", error);
    }
  };

  return {
    initialize: async (): Promise<void> => {
      try {
        initDb();
        refreshCache();
        console.error(`Loaded ${notesCache.length} notes from SQLite database`);
      } catch (error) {
        console.error("Failed to initialize SQLite database:", error);
        console.error("Starting with empty notes collection");
      }
    },

    addNote: (text: string, timestamp?: string, tags?: string[]): Note => {
      initDb();

      const newNote: Note = {
        id: generateUniqueId(),
        text,
        timestamp: timestamp || new Date().toISOString(),
        tags,
      };

      try {
        db.prepare(
          `
          INSERT INTO notes (id, text, timestamp, tags) 
          VALUES (?, ?, ?, ?)
        `
        ).run(
          newNote.id,
          newNote.text,
          newNote.timestamp,
          newNote.tags ? JSON.stringify(newNote.tags) : null
        );

        // Update cache
        notesCache.push(newNote);
      } catch (error) {
        console.error("Error saving note to SQLite:", error);
      }

      return newNote;
    },

    searchNotes: (query: string): Note[] => {
      refreshCache(); // Refresh cache before searching
      const lowerQuery = query.toLowerCase();
      return notesCache.filter(
        (note) =>
          note.text.toLowerCase().includes(lowerQuery) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    },

    getAllNotes: (): Note[] => {
      refreshCache(); // Refresh cache before returning all notes
      return [...notesCache];
    },

    deleteNote: (id: string): boolean => {
      initDb();

      try {
        const result = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
        if (result.changes > 0) {
          // Update cache
          notesCache = notesCache.filter((note) => note.id !== id);
          return true;
        }
      } catch (error) {
        console.error("Error deleting note from SQLite:", error);
      }

      return false;
    },
  };
}

export enum StorageType {
  FILE = "file",
  MEMORY = "memory",
  SQLITE = "sqlite",
}

export function createNoteStorage(
  type: StorageType = StorageType.SQLITE,
  options?: StorageOptions
): NoteStorage {
  switch (type) {
    case StorageType.MEMORY:
      return createInMemoryNoteStorage();

    case StorageType.SQLITE:
      try {
        const sqliteOptions = options?.sqlite || {};
        const dbPath = sqliteOptions.dbPath || SQLITE_DB_PATH;
        return createSqliteNoteStorage(dbPath);
      } catch (error) {
        console.error("Failed to create SQLite storage:", error);
        console.error("Falling back to file-based storage");
        return createFileNoteStorage();
      }

    case StorageType.FILE:
    default:
      const fileOptions = options?.file || {};
      const filePath = fileOptions.filePath || STORAGE_FILE_PATH;
      return createFileNoteStorage(filePath);
  }
}
