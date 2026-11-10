import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Grid, IconButton,
  LinearProgress, Skeleton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography
} from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BuildCircleRoundedIcon from "@mui/icons-material/BuildCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import BatteryAlertRoundedIcon from "@mui/icons-material/BatteryAlertRounded";
import EmergencyRoundedIcon from "@mui/icons-material/EmergencyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useDashboard } from "../hooks/useDashboard.js";

const statusPresentation = {
  operational: { label: "Operational", color: "success" },
  maintenance: { label: "Maintenance", color: "warning" },
  out_of_service: { label: "Out of service", color: "primary" },
  emergency: { label: "Emergency", color: "error" },
  inactive: { label: "Inactive", color: "default" }
};

const alertPresentation = {
  engine_fault: { label: "Engine fault", icon: BoltRoundedIcon, color: "error.main", tint: "#FDECEC" },
  low_battery: { label: "Low battery", icon: BatteryAlertRoundedIcon, color: "warning.main", tint: "#FFF4DE" },
  emergency_stop: { label: "Emergency stop", icon: EmergencyRoundedIcon, color: "error.main", tint: "#FDECEC" },
  status_change: { label: "Status changed", icon: DirectionsCarRoundedIcon, color: "primary.main", tint: "#E8F0FE" }
};

function relativeTime(value) {
  if (!value) return "No report";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function locationLabel(vehicle) {
  return vehicle.address?.city || vehicle.address?.region || (vehicle.latestLocation ? "GPS available" : "Not reported");
}

function SummaryCard({ item, loading }) {
  const Icon = item.icon;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: 13.5, fontWeight: 650 }}>{item.label}</Typography>
            {loading ? <Skeleton width={70} height={48} /> : <Typography sx={{ mt: 0.7, fontSize: 29, fontWeight: 800, letterSpacing: "-.03em" }}>{item.value}</Typography>}
          </Box>
          <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: item.tint, color: item.color, borderRadius: 2.5 }}><Icon /></Avatar>
        </Stack>
        {loading ? <Skeleton width={105} /> : <Typography sx={{ mt: 1.1, fontSize: 12.5, color: item.color, fontWeight: 650 }}>{item.detail}</Typography>}
      </CardContent>
    </Card>
  );
}

function normalizedPins(locations) {
  const usable = locations
    .map((item) => ({ item, coordinates: [item.longitude, item.latitude] }))
    .filter(({ coordinates }) => Array.isArray(coordinates) && coordinates.length === 2)
    .slice(0, 12);
  if (!usable.length) return [];
  const longitudes = usable.map(({ coordinates }) => coordinates[0]);
  const latitudes = usable.map(({ coordinates }) => coordinates[1]);
  const [minLongitude, maxLongitude] = [Math.min(...longitudes), Math.max(...longitudes)];
  const [minLatitude, maxLatitude] = [Math.min(...latitudes), Math.max(...latitudes)];
  return usable.map(({ item, coordinates }, index) => ({
    id: item.vehicleId || index,
    left: `${12 + ((coordinates[0] - minLongitude) / (maxLongitude - minLongitude || 1)) * 76}%`,
    top: `${18 + (1 - (coordinates[1] - minLatitude) / (maxLatitude - minLatitude || 1)) * 64}%`,
    color: index === 0 ? "#16A36A" : "#0B57D0"
  }));
}

function MapPreview({ locations, loading }) {
  const pins = normalizedPins(locations);
  return (
    <Box className="map-preview" sx={{ position: "relative", height: 270, borderRadius: 3, overflow: "hidden" }}>
      <Box className="map-road road-one" /><Box className="map-road road-two" /><Box className="map-road road-three" />
      {loading ? <Skeleton variant="rectangular" width="100%" height="100%" /> : pins.map((pin) => (
        <Tooltip key={pin.id} title={`Vehicle ${pin.id}`}>
          <Box sx={{ position: "absolute", left: pin.left, top: pin.top, transform: "translate(-50%, -50%)" }}>
            <Box sx={{ width: 28, height: 28, borderRadius: "50% 50% 50% 4px", bgcolor: pin.color, transform: "rotate(-45deg)", border: "3px solid white", boxShadow: "0 5px 13px rgba(0,0,0,.2)", display: "grid", placeItems: "center" }}>
              <DirectionsCarRoundedIcon sx={{ color: "white", fontSize: 13, transform: "rotate(45deg)" }} />
            </Box>
          </Box>
        </Tooltip>
      ))}
      {!loading && pins.length === 0 && <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", color: "text.secondary" }}><MapRoundedIcon /><Typography variant="body2">No vehicle locations reported yet</Typography></Stack>}
      {!loading && <Chip label={`${pins.length} active location${pins.length === 1 ? "" : "s"}`} size="small" sx={{ position: "absolute", left: 14, bottom: 14, bgcolor: "rgba(255,255,255,.94)" }} />}
    </Box>
  );
}

function VehicleTable({ vehicles, loading }) {
  return (
    <TableContainer>
      <Table sx={{ minWidth: 720 }}>
        <TableHead><TableRow>{["Vehicle", "Assignment", "Status", "Location", "Last report", ""].map((label) => <TableCell key={label} sx={{ color: "text.secondary", fontSize: 12, fontWeight: 800, bgcolor: "#F8FAFD", borderColor: "divider" }}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {loading && Array.from({ length: 4 }, (_, index) => <TableRow key={index}>{Array.from({ length: 6 }, (__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}
          {!loading && vehicles.map((vehicle) => {
            const status = statusPresentation[vehicle.operationalStatus] || statusPresentation.inactive;
            const vehicleId = vehicle.id || vehicle._id;
            return (
              <TableRow key={vehicleId} hover>
                <TableCell><Stack direction="row" spacing={1.3} sx={{ alignItems: "center" }}><Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: "#E8F0FE", color: "primary.main", borderRadius: 2 }}><DirectionsCarRoundedIcon fontSize="small" /></Avatar><Box><Typography sx={{ fontSize: 13.5, fontWeight: 750 }}>{vehicle.make} {vehicle.model}</Typography><Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{vehicle.registrationNumber}</Typography></Box></Stack></TableCell>
                <TableCell sx={{ fontSize: 13 }}>{vehicle.assignedUserId ? "Assigned" : "Unassigned"}</TableCell>
                <TableCell><Chip size="small" label={status.label} color={status.color} variant="outlined" /></TableCell>
                <TableCell sx={{ fontSize: 13 }}>{locationLabel(vehicle)}</TableCell>
                <TableCell sx={{ fontSize: 13, color: "text.secondary" }}>{relativeTime(vehicle.lastTelemetryAt || vehicle.latestLocation?.updatedAt)}</TableCell>
                <TableCell><IconButton size="small" aria-label={`Actions for ${vehicle.registrationNumber}`}><MoreHorizRoundedIcon /></IconButton></TableCell>
              </TableRow>
            );
          })}
          {!loading && vehicles.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>No vehicles have been registered.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function NotificationList({ notifications, total, loading }) {
  return (
    <Card><CardContent sx={{ p: 2.6 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="h2">Recent notifications</Typography><Typography variant="body2" color="text.secondary">SMS delivery activity</Typography></Box>{!loading && <Chip label={`${total} total`} color="error" size="small" />}</Stack>
      <Stack sx={{ mt: 1.5 }}>
        {loading && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={75} />)}
        {!loading && notifications.map((notification, index) => {
          const presentation = alertPresentation[notification.triggerType] || alertPresentation.status_change;
          const Icon = presentation.icon;
          return <Box key={notification.id || notification._id}><Stack direction="row" spacing={1.4} sx={{ py: 1.65 }}><Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: presentation.tint, color: presentation.color, borderRadius: 2.2 }}><Icon fontSize="small" /></Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}><Typography noWrap sx={{ fontSize: 13.5, fontWeight: 750 }}>{presentation.label}</Typography><Chip size="small" label={notification.status} color={notification.status === "sent" ? "success" : notification.status === "failed" ? "error" : "warning"} variant="outlined" /></Stack><Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>{notification.message}</Typography><Typography sx={{ mt: 0.3, fontSize: 11.5, color: "text.secondary" }}>{relativeTime(notification.createdAt)}</Typography></Box></Stack>{index < notifications.length - 1 && <Divider />}</Box>;
        })}
        {!loading && notifications.length === 0 && <Box sx={{ py: 5, textAlign: "center", color: "text.secondary" }}><CheckCircleRoundedIcon sx={{ mb: 1, color: "success.main" }} /><Typography variant="body2">No notifications to show</Typography></Box>}
      </Stack>
      <Button component={Link} to="/notifications" fullWidth variant="outlined" sx={{ mt: 1.5 }}>Review notifications</Button>
    </CardContent></Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useDashboard();
  const counts = data?.statusCounts || {};
  const total = data?.totalVehicles || 0;
  const summaries = [
    { label: "Total vehicles", value: total, detail: total ? "Registered fleet" : "No vehicles yet", icon: DirectionsCarRoundedIcon, color: "#0B57D0", tint: "#E8F0FE" },
    { label: "Operational", value: counts.operational || 0, detail: total ? `${Math.round(((counts.operational || 0) / total) * 100)}% of fleet` : "Awaiting registrations", icon: CheckCircleRoundedIcon, color: "#158A5A", tint: "#E7F7EF" },
    { label: "In maintenance", value: counts.maintenance || 0, detail: counts.maintenance ? "Requires coordination" : "No maintenance cases", icon: BuildCircleRoundedIcon, color: "#C87913", tint: "#FFF4DE" },
    { label: "Notifications", value: data?.totalNotifications || 0, detail: data?.totalNotifications ? "Review recent activity" : "No recent alerts", icon: WarningAmberRoundedIcon, color: "#C53D3D", tint: "#FDECEC" }
  ];
  const statusRows = ["operational", "maintenance", "out_of_service", "emergency"];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1720, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 3 }}>
        <Box><Typography variant="h1">{greeting}, {user?.name?.split(" ")[0]}</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Live operational data from across your fleet.</Typography></Box>
        <Stack direction="row" spacing={1.2}>
          <Tooltip title="Refresh dashboard"><IconButton onClick={refresh} disabled={loading} aria-label="Refresh dashboard" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}><RefreshRoundedIcon /></IconButton></Tooltip>
          <Button component={Link} to="/map" variant="outlined" startIcon={<MapRoundedIcon />}>View live map</Button>
          <Button component={Link} to="/vehicles" variant="contained" startIcon={<AddRoundedIcon />}>Add vehicle</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" icon={<CloudOffRoundedIcon />} action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>} sx={{ mb: 2.2 }}><strong>Dashboard unavailable.</strong> {error.message}</Alert>}
      {data?.issues?.length > 0 && <Alert severity="warning" sx={{ mb: 2.2 }}>{data.issues.map((issue) => issue.name).join(" and ")} could not be loaded. Available dashboard data is still shown.</Alert>}

      <Grid container spacing={2.2} sx={{ mb: 2.2 }}>{summaries.map((item) => <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 3 }}><SummaryCard item={item} loading={loading} /></Grid>)}</Grid>

      <Grid container spacing={2.2}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Card sx={{ mb: 2.2 }}><CardContent sx={{ p: { xs: 2, md: 2.6 }, "&:last-child": { pb: { xs: 2, md: 2.6 } } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}><Box><Typography variant="h2">Live fleet overview</Typography><Typography variant="body2" color="text.secondary">Latest coordinates reported by vehicles</Typography></Box><Button component={Link} to="/map" endIcon={<ArrowForwardRoundedIcon />}>Open map</Button></Stack>
            <MapPreview locations={data?.locations || []} loading={loading} />
          </CardContent></Card>

          <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: { xs: 2, md: 2.6 }, pt: 2.5, pb: 1.5 }}><Box><Typography variant="h2">Vehicle activity</Typography><Typography variant="body2" color="text.secondary">Most recently registered vehicles</Typography></Box><Button component={Link} to="/vehicles" endIcon={<ArrowForwardRoundedIcon />}>View all</Button></Stack>
            <VehicleTable vehicles={data?.vehicles || []} loading={loading} />
          </CardContent></Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Card sx={{ mb: 2.2 }}><CardContent sx={{ p: 2.6 }}>
            <Typography variant="h2">Fleet status</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2.7 }}>Current operational availability</Typography>
            {statusRows.map((statusKey) => {
              const presentation = statusPresentation[statusKey];
              const count = counts[statusKey] || 0;
              const percentage = total ? (count / total) * 100 : 0;
              return <Box key={statusKey} sx={{ mb: 2.25 }}><Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.8 }}><Typography sx={{ fontSize: 13, fontWeight: 650 }}>{presentation.label}</Typography>{loading ? <Skeleton width={30} /> : <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{count}</Typography>}</Stack><LinearProgress variant="determinate" value={loading ? 0 : percentage} color={presentation.color} sx={{ height: 8, borderRadius: 8, bgcolor: "#EDF1F6" }} /></Box>;
            })}
            <Divider sx={{ my: 2.4 }} /><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography color="text.secondary" variant="body2">Fleet availability</Typography><Typography sx={{ color: "success.main", fontWeight: 800 }}>{total ? `${Math.round(((counts.operational || 0) / total) * 100)}%` : "—"}</Typography></Stack>
          </CardContent></Card>

          <NotificationList notifications={data?.notifications || []} total={data?.totalNotifications || 0} loading={loading} />
        </Grid>
      </Grid>
    </Box>
  );
}
