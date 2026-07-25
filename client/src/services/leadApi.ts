import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { Lead, LeadDetail, LeadStatus, PaginationMeta } from "../types/models";

export interface ListLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus;
  assignedToId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "value" | "status";
  order?: "asc" | "desc";
}

export interface ListLeadsResult {
  leads: Lead[];
  meta: PaginationMeta;
}

export async function listLeads(params: ListLeadsParams = {}): Promise<ListLeadsResult> {
  const res = await apiClient.get<ApiSuccess<Lead[]>>("/leads", { params });
  return { leads: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function getLead(id: string): Promise<LeadDetail> {
  const res = await apiClient.get<ApiSuccess<LeadDetail>>(`/leads/${id}`);
  return res.data.data;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  value?: number;
  assignedToId?: string;
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const res = await apiClient.post<ApiSuccess<Lead>>("/leads", input);
  return res.data.data;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  value?: number;
  status?: LeadStatus;
  assignedToId?: string | null;
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
  const res = await apiClient.put<ApiSuccess<Lead>>(`/leads/${id}`, input);
  return res.data.data;
}

export async function deleteLead(id: string): Promise<void> {
  await apiClient.delete(`/leads/${id}`);
}
