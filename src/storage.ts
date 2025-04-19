import * as fs from "fs/promises";
import { STORAGE_FILE_PATH } from "./constants";
import { Note } from "./types";
import { generateUniqueId, safeJsonParse } from "./utils";

export const createNoteStorage = () => {
  // Internal state
  let notes: Note[] = [];

  const save = async (): Promise<void> => {
    try {
      await fs.writeFile(STORAGE_FILE_PATH, JSON.stringify(notes, null, 2));
    } catch (error) {
      console.error("Failed to save notes to file:", error);
    }
  };

  return {
    initialize: async (): Promise<void> => {
      try {
        const data = await fs.readFile(STORAGE_FILE_PATH, "utf-8");
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
};
