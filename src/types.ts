export type Note = {
  id: string;
  text: string;
  timestamp: string;
  tags?: string[];
};

export interface NoteStorage {
  initialize(): Promise<void>;
  addNote(text: string, timestamp?: string, tags?: string[]): Note;
  searchNotes(query: string): Note[];
  getAllNotes(): Note[];
  deleteNote(id: string): boolean;
}

// Storage options types
export type FileStorageOptions = {
  filePath?: string;
};

export type SqliteStorageOptions = {
  dbPath?: string;
};

// No options needed for memory storage
export type MemoryStorageOptions = Record<string, never>;

// Combined storage options type
export type StorageOptions = {
  file?: FileStorageOptions;
  sqlite?: SqliteStorageOptions;
  memory?: MemoryStorageOptions;
};
