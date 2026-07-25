/**
 * Catches uncaught render errors anywhere in the tree and shows a recovery
 * screen instead of a blank white page. Without this, one thrown error in
 * any component unmounts the whole app. Class component because error
 * boundaries have no hook equivalent.
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd forward to Sentry/Datadog.
    console.error("Uncaught render error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          textAlign: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            Something went wrong
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
            An unexpected error occurred. Reloading usually fixes it.
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            Reload app
          </Button>
        </Stack>
      </Box>
    );
  }
}
