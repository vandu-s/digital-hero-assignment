import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { Note } from "../types/models";

export async function createNote(input: { leadId: string; body: string }): Promise<Note> {
  const res = await apiClient.post<ApiSuccess<Note>>("/notes", input);
  return res.data.data;
}
