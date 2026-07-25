import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { Lead } from "../types/models";

export interface CreatePublicLeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
}

export async function createPublicLead(input: CreatePublicLeadInput): Promise<Lead> {
  const res = await apiClient.post<ApiSuccess<Lead>>("/leads/public", input);
  return res.data.data;
}
