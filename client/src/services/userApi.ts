import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { PaginationMeta, Role, User } from "../types/models";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  sortBy?: "createdAt" | "name" | "email" | "role";
  order?: "asc" | "desc";
}

export interface ListUsersResult {
  users: User[];
  meta: PaginationMeta;
}

/**
 * Unpaginated fetch of every user - used by the lead assignment dropdowns,
 * which need the full list. Sends no page/limit so the API returns all rows.
 */
export async function listUsers(): Promise<User[]> {
  const res = await apiClient.get<ApiSuccess<User[]>>("/users");
  return res.data.data;
}

/**
 * Paginated fetch for the admin Users table. Because `page`/`limit` are sent,
 * the API responds with a `meta` block describing the total row count.
 */
export async function listUsersPaged(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const res = await apiClient.get<ApiSuccess<User[]>>("/users", { params });
  return { users: res.data.data, meta: res.data.meta as PaginationMeta };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  const res = await apiClient.post<ApiSuccess<User>>("/users", input);
  return res.data.data;
}

export async function updateUser(id: string, input: { name?: string; role?: Role }): Promise<User> {
  const res = await apiClient.put<ApiSuccess<User>>(`/users/${id}`, input);
  return res.data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
