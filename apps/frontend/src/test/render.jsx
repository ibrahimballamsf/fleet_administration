import { CssBaseline, ThemeProvider } from "@mui/material";
import { render } from "@testing-library/react";
import { fleetTheme } from "../theme.js";

export function renderWithTheme(ui) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={fleetTheme}><CssBaseline />{children}</ThemeProvider>
  });
}
