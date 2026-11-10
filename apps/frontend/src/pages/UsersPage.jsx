import { useCallback, useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LockPersonRoundedIcon from "@mui/icons-material/LockPersonRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, IconButton, MenuItem,
  Skeleton, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { authApi, userApi } from "../api/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import UserFormDialog from "../components/users/UserFormDialog.jsx";
import UserRoleDialog from "../components/users/UserRoleDialog.jsx";

const roleOptions = [["", "All roles"], ["admin", "Administrators"], ["dispatcher", "Dispatchers"], ["viewer", "Viewers"]];
const statusOptions = [["", "All statuses"], ["true", "Active"], ["false", "Inactive"]];
const rolePresentation = {
  admin: { label: "Administrator", color: "primary" },
  dispatcher: { label: "Dispatcher", color: "warning" },
  viewer: { label: "Viewer", color: "default" }
};
const emptyFilters = { role: "", isActive: "" };
const getUserId = (user) => user?.id || user?._id;

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";
}

function SummaryCard({ label, value, icon, color = "primary.main" }) {
  return <Card><CardContent sx={{ p: 2.2, "&:last-child": { pb: 2.2 } }}><Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}><Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography><Typography variant="h2" sx={{ mt: .7 }}>{value}</Typography></Box><Avatar sx={{ bgcolor: "#EDF3FF", color }}>{icon}</Avatar></Stack></CardContent></Card>;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: isAdmin, users: [], total: 0, error: null });
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    const query = { page: page + 1, pageSize };
    if (appliedFilters.role) query.role = appliedFilters.role;
    if (appliedFilters.isActive) query.isActive = appliedFilters.isActive;
    userApi.list(query, { signal: controller.signal })
      .then(({ data, meta }) => setState({ loading: false, users: data, total: meta?.pagination?.totalItems ?? data.length, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, users: [], total: 0, error }); });
    return () => controller.abort();
  }, [isAdmin, page, pageSize, appliedFilters, reloadKey]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  function applyFilters(event) {
    event.preventDefault();
    setPage(0);
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(0);
  }

  async function saveUser(values) {
    setBusy(true);
    try {
      if (editUser) {
        await userApi.update(getUserId(editUser), values);
        setNotice({ severity: "success", message: "User profile updated." });
      } else {
        await authApi.register(values);
        setNotice({ severity: "success", message: "Fleet user created with viewer access." });
      }
      setFormOpen(false);
      setEditUser(null);
      refresh();
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(role) {
    setBusy(true);
    try {
      await userApi.updateRole(getUserId(roleUser), role);
      setNotice({ severity: "success", message: `${roleUser.name}'s role was updated.` });
      setRoleUser(null);
      refresh();
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 900, mx: "auto" }}><Card><CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}><Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "#EDF3FF", color: "primary.main" }}><LockPersonRoundedIcon fontSize="large" /></Avatar><Typography variant="h1">Administrator access required</Typography><Typography color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: "auto" }}>User accounts and access roles contain sensitive fleet permissions. Ask an administrator if your responsibilities require access.</Typography></CardContent></Card></Box>;
  }

  const visibleAdmins = state.users.filter((user) => user.role === "admin").length;
  const visibleActive = state.users.filter((user) => user.isActive).length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1720, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 3 }}>
        <Box><Typography variant="h1">Users & roles</Typography><Typography color="text.secondary" sx={{ mt: .7 }}>Create fleet accounts, maintain contact preferences, and control access.</Typography></Box>
        <Stack direction="row" spacing={1}><Tooltip title="Refresh users"><IconButton onClick={refresh} aria-label="Refresh users" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}><RefreshRoundedIcon /></IconButton></Tooltip><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setEditUser(null); setFormOpen(true); }}>Create user</Button></Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2.2 }}>
        <Grid size={{ xs: 12, sm: 4 }}><SummaryCard label="Total records" value={state.total} icon={<GroupRoundedIcon />} /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><SummaryCard label="Visible active" value={visibleActive} icon={<GroupRoundedIcon />} color="success.main" /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><SummaryCard label="Visible admins" value={visibleAdmins} icon={<AdminPanelSettingsRoundedIcon />} /></Grid>
      </Grid>

      <Card sx={{ mb: 2.2 }}><CardContent component="form" onSubmit={applyFilters} sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}><Grid container spacing={1.5} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, md: 4 }}><TextField select size="small" label="Access role" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))} fullWidth>{roleOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField select size="small" label="Account status" value={filters.isActive} onChange={(event) => setFilters((current) => ({ ...current, isActive: event.target.value }))} fullWidth>{statusOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 4 }}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" fullWidth>Apply filters</Button><Tooltip title="Clear filters"><IconButton aria-label="Clear user filters" onClick={clearFilters}><FilterAltOffRoundedIcon /></IconButton></Tooltip></Stack></Grid>
      </Grid></CardContent></Card>

      {state.error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>} sx={{ mb: 2 }}>{state.error.message}</Alert>}

      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <TableContainer><Table sx={{ minWidth: 960 }}>
          <TableHead><TableRow>{["User", "Phone", "Access role", "Status", "SMS preferences", "Joined", "Actions"].map((label) => <TableCell key={label} sx={{ bgcolor: "#F8FAFD", color: "text.secondary", fontWeight: 800, fontSize: 12 }}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {state.loading && Array.from({ length: 6 }, (_, row) => <TableRow key={row}>{Array.from({ length: 7 }, (__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}
            {!state.loading && state.users.map((user) => {
              const role = rolePresentation[user.role] || rolePresentation.viewer;
              const self = getUserId(user) === getUserId(currentUser);
              const preferences = user.notificationPreferences || {};
              return <TableRow key={getUserId(user)} hover><TableCell><Stack direction="row" spacing={1.3} sx={{ alignItems: "center" }}><Avatar sx={{ bgcolor: "#E8F0FE", color: "primary.main", fontSize: 13, fontWeight: 800 }}>{initials(user.name)}</Avatar><Box><Stack direction="row" spacing={.7} sx={{ alignItems: "center" }}><Typography sx={{ fontWeight: 750, fontSize: 13.5 }}>{user.name}</Typography>{self && <Chip label="You" size="small" variant="outlined" />}</Stack><Typography variant="caption" color="text.secondary">{user.email}</Typography></Box></Stack></TableCell><TableCell>{user.phoneNumber || "—"}</TableCell><TableCell><Chip label={role.label} color={role.color} size="small" variant="outlined" /></TableCell><TableCell><Chip label={user.isActive ? "Active" : "Inactive"} color={user.isActive ? "success" : "default"} size="small" /></TableCell><TableCell><Typography variant="caption" color="text.secondary">Critical: {preferences.criticalEvents === false ? "Off" : "On"}<br />Status: {preferences.statusChanges === false ? "Off" : "On"}</Typography></TableCell><TableCell>{formatDate(user.createdAt)}</TableCell><TableCell><Stack direction="row" spacing={.3}><Tooltip title="Edit profile"><IconButton size="small" aria-label={`Edit ${user.name}`} onClick={() => { setEditUser(user); setFormOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip><Tooltip title={self ? "You cannot change your own role here" : "Change access role"}><span><IconButton size="small" aria-label={`Change ${user.name}'s role`} disabled={self} onClick={() => setRoleUser(user)}><AdminPanelSettingsRoundedIcon fontSize="small" /></IconButton></span></Tooltip></Stack></TableCell></TableRow>;
            })}
            {!state.loading && state.users.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><GroupRoundedIcon sx={{ fontSize: 44, color: "text.disabled" }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No users match these filters.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={state.total} page={page} onPageChange={(_event, nextPage) => setPage(nextPage)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[5, 10, 20, 50]} />
      </CardContent></Card>

      <UserFormDialog open={formOpen} user={editUser} busy={busy} onClose={() => { setFormOpen(false); setEditUser(null); }} onSubmit={saveUser} />
      <UserRoleDialog user={roleUser} busy={busy} onClose={() => setRoleUser(null)} onSubmit={changeRole} />
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>{notice ? <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}</Snackbar>
    </Box>
  );
}
