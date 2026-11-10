import { createTheme } from "@mui/material/styles";

export const fleetTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0B57D0",
      light: "#4C8DF6",
      dark: "#063A91",
      contrastText: "#FFFFFF"
    },
    secondary: {
      main: "#00A3A3"
    },
    background: {
      default: "#F4F7FB",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#17233C",
      secondary: "#64748B"
    },
    success: { main: "#16A36A" },
    warning: { main: "#E69B22" },
    error: { main: "#D94A4A" },
    divider: "#E6ECF3"
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontSize: "2rem", fontWeight: 750, letterSpacing: "-0.035em" },
    h2: { fontSize: "1.35rem", fontWeight: 750, letterSpacing: "-0.02em" },
    h3: { fontSize: "1rem", fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
    body2: { lineHeight: 1.55 }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, minHeight: 40 } }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E6ECF3",
          boxShadow: "0 8px 30px rgba(23, 35, 60, 0.05)"
        }
      }
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } }
    }
  }
});
