import { apiClient } from "./apiClient";
import { ApiSuccess } from "../types/api";
import { User } from "../types/models";

export interface AuthResponse {
  user: User;
  token: string;
}

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiClient.post<ApiSuccess<AuthResponse>>("/auth/register", input);
  return res.data.data;
}

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiClient.post<ApiSuccess<AuthResponse>>("/auth/login", input);
  return res.data.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get<ApiSuccess<{ user: User }>>("/auth/me");
  return res.data.data.user;
}

// Access tokens are stateless, so the real logout is clearing the client
// token; this call just notifies the server (and gives a future token
// denylist a hook). Failure is non-fatal - the caller clears the token
// regardless.
export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}
