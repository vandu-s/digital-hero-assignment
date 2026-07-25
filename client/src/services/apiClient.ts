/**
 * Single shared Axios instance. Every API call in the app goes through
 * this - the request interceptor attaches the JWT, and the response
 * interceptor reacts to an expired/invalid token (401) by clearing it and
 * broadcasting an event, rather than importing the router here directly
 * (Axios has no natural access to React Router - a DOM event decouples the
 * two, and App.tsx's listener is the one place that performs the redirect).
 */
import axios from "axios";
import { clearToken, getToken } from "../utils/tokenStorage";

export const AUTH_EXPIRED_EVENT = "auth:expired";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);
