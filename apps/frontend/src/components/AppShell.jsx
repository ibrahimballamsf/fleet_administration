import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../auth/AuthContext.jsx";

const drawerWidth = 268;

const navigation = [
  { label: "Overview", path: "/", icon: DashboardRoundedIcon },
  { label: "Vehicles", path: "/vehicles", icon: DirectionsCarRoundedIcon },
  { label: "Live map", path: "/map", icon: MapRoundedIcon },
  { label: "Telemetry", path: "/telemetry", icon: SpeedRoundedIcon },
  { label: "Notifications", path: "/notifications", icon: NotificationsRoundedIcon, badge: 3 },
  { label: "Users & roles", path: "/users", icon: GroupRoundedIcon }
];

function Brand() {
  return (
    <Stack direction="row" spacing={1.4} sx={{ alignItems: "center", px: 2.5, py: 2.4 }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2.5,
          display: "grid",
          placeItems: "center",
          bgcolor: "white",
          color: "primary.main",
          fontWeight: 900,
          fontSize: 22,
          boxShadow: "0 8px 20px rgba(0,0,0,.16)"
        }}
      >
        F
      </Box>
      <Box>
        <Typography sx={{ color: "white", fontWeight: 800, fontSize: 19, lineHeight: 1.1 }}>
          FleetFlow
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,.64)", fontSize: 11.5, letterSpacing: ".08em" }}>
          ADMINISTRATION
        </Typography>
      </Box>
    </Stack>
  );
}

function initials(name = "Fleet User") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function DrawerContent({ onNavigate, user, onLogout }) {
  const apiDocsUrl = useMemo(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    return `${baseUrl.replace(/\/$/, "")}/api-docs`;
  }, []);

  return (
    <Stack sx={{ height: "100%" }}>
      <Brand />
      <Typography sx={{ px: 3, pt: 1.8, pb: 1, color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 800, letterSpacing: ".11em" }}>
        WORKSPACE
      </Typography>
      <List sx={{ px: 1.5, py: 0 }}>
        {navigation.map(({ label, path, icon: Icon, badge }) => (
          <ListItemButton
            key={path}
            component={NavLink}
            to={path}
            end={path === "/"}
            onClick={onNavigate}
            sx={{
              mb: 0.45,
              minHeight: 47,
              color: "rgba(255,255,255,.74)",
              borderRadius: 2.5,
              "& .MuiListItemIcon-root": { color: "inherit" },
              "&.active": {
                color: "white",
                bgcolor: "rgba(255,255,255,.14)",
                boxShadow: "inset 3px 0 0 #7DB7FF"
              },
              "&:hover": { bgcolor: "rgba(255,255,255,.1)" }
            }}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 650 } } }} />
            {badge ? (
              <Box sx={{ minWidth: 23, height: 23, px: 0.6, borderRadius: 8, bgcolor: "#FFB4A8", color: "#7A2318", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>
                {badge}
              </Box>
            ) : null}
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mx: 2.5, my: 2, borderColor: "rgba(255,255,255,.12)" }} />
      <List sx={{ px: 1.5, py: 0 }}>
        <ListItemButton
          component="a"
          href={apiDocsUrl}
          target="_blank"
          rel="noreferrer"
          sx={{ color: "rgba(255,255,255,.74)", borderRadius: 2.5, "&:hover": { bgcolor: "rgba(255,255,255,.1)" } }}
        >
          <ListItemIcon sx={{ minWidth: 42, color: "inherit" }}><MenuBookRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="API documentation" slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 650 } } }} />
        </ListItemButton>
      </List>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ m: 2, p: 1.6, borderRadius: 3, bgcolor: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)" }}>
        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: "#75A7F8", fontSize: 14, fontWeight: 800 }}>{initials(user?.name)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ color: "white", fontSize: 13.5, fontWeight: 700 }}>{user?.name}</Typography>
            <Typography noWrap sx={{ color: "rgba(255,255,255,.56)", fontSize: 11.5, textTransform: "capitalize" }}>{user?.role}</Typography>
          </Box>
          <Tooltip title="Sign out"><IconButton size="small" onClick={onLogout} aria-label="Sign out" sx={{ color: "rgba(255,255,255,.65)" }}><LogoutRoundedIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
        </Stack>
      </Box>
    </Stack>
  );
}

export default function AppShell() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const current = navigation.find((item) => item.path === location.pathname)?.label ?? "Overview";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,.92)",
          backdropFilter: "blur(12px)"
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 68, md: 76 }, gap: 1.5, px: { xs: 2, md: 3.5 } }}>
          {!desktop && (
            <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography variant="caption" color="text.secondary">Fleet management</Typography>
            <Typography sx={{ fontWeight: 760, lineHeight: 1.2 }}>{current}</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Search vehicles, users…"
            aria-label="Search fleet"
            sx={{
              width: { xs: 44, sm: 260, md: 320 },
              "& .MuiOutlinedInput-root": { bgcolor: "#F5F8FC", borderRadius: 2.5 },
              "& input": { display: { xs: "none", sm: "block" } },
              "& fieldset": { borderColor: "transparent" }
            }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> } }}
          />
          <Tooltip title="Notifications">
            <IconButton aria-label="Notifications">
              <Badge badgeContent={3} color="error"><NotificationsRoundedIcon /></Badge>
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ my: 2, display: { xs: "none", sm: "block" } }} />
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.main", fontSize: 13, fontWeight: 800 }}>{initials(user?.name)}</Avatar>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 750, lineHeight: 1.2 }}>{user?.name?.split(" ")[0]}</Typography>
              <Typography sx={{ fontSize: 11.5, color: "text.secondary", textTransform: "capitalize" }}>{user?.role}</Typography>
            </Box>
            <KeyboardArrowDownRoundedIcon sx={{ color: "text.secondary", display: { xs: "none", md: "block" } }} />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Main navigation" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={desktop ? "permanent" : "temporary"}
          open={desktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              border: 0,
              color: "white",
              background: "linear-gradient(180deg, #083C94 0%, #0B57D0 58%, #073778 100%)"
            }
          }}
        >
          <DrawerContent onNavigate={() => setMobileOpen(false)} user={user} onLogout={logout} />
        </Drawer>
      </Box>

      <Box component="main" sx={{ ml: { lg: `${drawerWidth}px` }, pt: { xs: "68px", md: "76px" }, minHeight: "100vh" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
