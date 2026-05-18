import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#020408", paper: "#0a1018" },
    primary:    { main: "#00ff88" },
    secondary:  { main: "#00d4ff" },
    error:      { main: "#ff3355" },
    warning:    { main: "#ffaa00" },
    text: {
      primary:   "#c8e6d0",
      secondary: "#4a7a5a",
    },
  },
  typography: {
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
    h1: { fontFamily: "'Orbitron', sans-serif" },
    h2: { fontFamily: "'Orbitron', sans-serif" },
    h3: { fontFamily: "'Orbitron', sans-serif" },
    h4: { fontFamily: "'Orbitron', sans-serif" },
    h5: { fontFamily: "'Orbitron', sans-serif" },
    h6: { fontFamily: "'Orbitron', sans-serif" },
    button: { fontFamily: "'Orbitron', sans-serif" },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundImage: "none" },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);