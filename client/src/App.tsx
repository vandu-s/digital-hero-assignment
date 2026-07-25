/**
 * Root component: kicks off session rehydration on boot (so a page
 * refresh doesn't bounce a logged-in user to /login), listens for the
 * apiClient's "token expired" event to force a clean logout, and renders
 * the route tree.
 */
import { useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AUTH_EXPIRED_EVENT } from "./services/apiClient";
import { logout, rehydrateSession } from "./features/auth/authSlice";
import { useAppDispatch } from "./hooks/reduxHooks";
import { AppRouter } from "./routes/AppRouter";

function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(rehydrateSession());
  }, [dispatch]);

  useEffect(() => {
    function handleAuthExpired() {
      dispatch(logout());
      navigate("/login");
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [dispatch, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
