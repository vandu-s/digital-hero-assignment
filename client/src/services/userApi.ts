import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { Role, User } from "../types/models";

export async function listUsers(): Promise<User[]> {
  const res = await apiClient.get<ApiSuccess<User[]>>("/users");
  return res.data.data;
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
