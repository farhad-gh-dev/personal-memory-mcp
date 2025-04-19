export const SERVER_NAME = "PersonalMemoryServer";
export const SERVER_VERSION = "1.0.0";
export const STORAGE_FILE_PATH =
  "C:\\Users\\farha\\Desktop\\work\\projects\\_mini-pj\\personal-memory-mcp\\storage\\notes.json";

export const MESSAGES = {
  NO_NOTES_FOUND: "No matching notes found.",
  SERVER_STARTED: "Personal Memory MCP Server started on stdio.",
  NOTE_DELETED: (id: string) => `Note with ID ${id} successfully deleted.`,
  NOTE_NOT_FOUND: (id: string) => `No note with ID ${id} found.`,
  NOTE_STORED: (id: string, timestamp: string) =>
    `Note stored with ID: ${id} at ${timestamp}.`,
};
