import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";

export default function SectionPage({ title, description, icon: Icon, action }) {
  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, mb: 3 }}>
        <Box>
          <Typography variant="h1">{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.7 }}>{description}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />}>{action}</Button>
      </Stack>
      <Card>
        <CardContent sx={{ minHeight: 470, display: "grid", placeItems: "center", textAlign: "center", p: 4 }}>
          <Stack spacing={2} sx={{ alignItems: "center", maxWidth: 480 }}>
            <Box sx={{ width: 82, height: 82, borderRadius: 5, bgcolor: "#E8F0FE", color: "primary.main", display: "grid", placeItems: "center" }}>
              <Icon sx={{ fontSize: 40 }} />
            </Box>
            <Chip icon={<ConstructionRoundedIcon />} label="Frontend shell ready" color="primary" variant="outlined" />
            <Typography variant="h2">{title} workspace</Typography>
            <Typography color="text.secondary">
              Navigation and responsive layout are in place. Data loading, forms, filters, and backend integration will be implemented in the feature phase.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
