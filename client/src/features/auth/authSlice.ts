/**
 * Auth state: current user, loading/error status for login/register, and
 * whether we've finished trying to rehydrate a session from a stored
 * token on app boot. That last flag (`status === "idle"` vs "checking")
 * is what lets ProtectedRoute avoid a flash-redirect-to-login before the
 * /auth/me call has had a chance to complete.
 */
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchCurrentUser, loginRequest, registerRequest } from "../../services/authApi";
import { User } from "../../types/models";
import { clearToken, getToken, setToken } from "../../utils/tokenStorage";
import { ApiError } from "../../types/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  actionLoading: boolean;
  actionError: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "checking",
  actionLoading: false,
  actionError: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const apiError = (error as { response?: { data?: ApiError } })?.response?.data;
  return apiError?.error?.message ?? fallback;
}

export const login = createAsyncThunk(
  "auth/login",
  async (input: { email: string; password: string; remember?: boolean }, { rejectWithValue }) => {
    try {
      const result = await loginRequest({ email: input.email, password: input.password });
      // `remember` chooses local (persistent) vs session (until tab close) storage.
      setToken(result.token, input.remember ?? true);
      return result.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Login failed"));
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (input: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await registerRequest(input);
      setToken(result.token);
      return result.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Registration failed"));
    }
  }
);

// Runs once on app boot: if a token is already stored, verify it's still
// valid by fetching the current user rather than trusting it blindly.
export const rehydrateSession = createAsyncThunk("auth/rehydrateSession", async () => {
  const token = getToken();
  if (!token) {
    throw new Error("No stored token");
  }
  return fetchCurrentUser();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearToken();
      state.user = null;
      state.status = "unauthenticated";
    },
    clearActionError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.actionLoading = false;
        state.user = action.payload;
        state.status = "authenticated";
      })
      .addCase(login.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = (action.payload as string) ?? "Login failed";
      })
      .addCase(register.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.actionLoading = false;
        state.user = action.payload;
        state.status = "authenticated";
      })
      .addCase(register.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = (action.payload as string) ?? "Registration failed";
      })
      .addCase(rehydrateSession.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.status = "authenticated";
      })
      .addCase(rehydrateSession.rejected, (state) => {
        clearToken();
        state.user = null;
        state.status = "unauthenticated";
      });
  },
});

export const { logout, clearActionError } = authSlice.actions;
export default authSlice.reducer;
