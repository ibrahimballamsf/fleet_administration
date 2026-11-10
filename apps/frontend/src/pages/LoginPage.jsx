import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const { authenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (authenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.05fr .95fr" }, bgcolor: "background.default" }}>
      <Box sx={{ display: { xs: "none", lg: "flex" }, position: "relative", overflow: "hidden", p: 8, flexDirection: "column", justifyContent: "space-between", color: "white", background: "linear-gradient(145deg, #063A91 0%, #0B57D0 58%, #3181F7 100%)" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: "white", color: "primary.main", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 24 }}>F</Box>
          <Box><Typography sx={{ fontWeight: 850, fontSize: 22 }}>FleetFlow</Typography><Typography sx={{ opacity: .65, fontSize: 12, letterSpacing: ".12em" }}>ADMINISTRATION</Typography></Box>
        </Stack>
        <Box sx={{ position: "relative", zIndex: 1, maxWidth: 620 }}>
          <Typography sx={{ fontSize: "clamp(2.8rem, 5vw, 5.2rem)", fontWeight: 850, lineHeight: .98, letterSpacing: "-.055em" }}>Every vehicle.<br />One clear view.</Typography>
          <Typography sx={{ mt: 3, maxWidth: 500, fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,.76)" }}>Monitor vehicle status, live locations, telemetry, and critical notifications from a single operational workspace.</Typography>
        </Box>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", color: "rgba(255,255,255,.68)" }}><DirectionsCarRoundedIcon /><Typography variant="body2">Secure fleet operations platform</Typography></Stack>
        <Box sx={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "90px solid rgba(255,255,255,.055)", right: -180, top: -170 }} />
      </Box>

      <Box sx={{ display: "grid", placeItems: "center", p: { xs: 2, sm: 5 } }}>
        <Card sx={{ width: "100%", maxWidth: 480 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 }, "&:last-child": { pb: { xs: 3, sm: 5 } } }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: "#E8F0FE", color: "primary.main", display: "grid", placeItems: "center", mb: 3 }}><LockRoundedIcon /></Box>
            <Typography variant="h1">Welcome back</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>Sign in with your fleet administration account.</Typography>
            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.2}>
                <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
                <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth />
                <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 1 }}>
                  {submitting ? <CircularProgress size={23} color="inherit" /> : "Sign in to FleetFlow"}
                </Button>
              </Stack>
            </Box>
            <Typography sx={{ mt: 3, fontSize: 12.5, color: "text.secondary", textAlign: "center" }}>API-key and JWT authentication are applied automatically.</Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
