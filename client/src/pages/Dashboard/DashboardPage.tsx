/**
 * Dashboard aggregates data purely from GET /leads (the same endpoint the
 * Leads page uses) rather than a dedicated /stats endpoint - for this
 * project's scale, fetching one page of up to 100 leads and reducing it
 * client-side is simpler than adding and maintaining a second backend
 * aggregation endpoint. If the lead volume grew into the thousands, a
 * real /dashboard/stats endpoint computed in the DB would be the next step.
 */
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { StatCard } from "../../components/StatCard";
import { StatusChip } from "../../components/StatusChip";
import { LeadsStatusDonut } from "../../components/LeadsStatusDonut";
import { LeadsOverTimeChart } from "../../components/LeadsOverTimeChart";
import { LoadingState } from "../../components/states/LoadingState";
import { ErrorState } from "../../components/states/ErrorState";
import { listLeads } from "../../services/leadApi";
import { Lead, LeadStatus } from "../../types/models";
import { formatDate } from "../../utils/formatDate";
import { LEAD_STATUS_HEX, LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "../../utils/leadStatus";

// The dashboard aggregates from a single page of recent leads. Named so the
// magic number has meaning and the cap is discoverable.
const DASHBOARD_LEAD_SAMPLE_SIZE = 100;

// The KPI cards: one "Total" card plus one per pipeline status, in order.
const KPI_STATUSES: LeadStatus[] = LEAD_STATUS_ORDER;

export function DashboardPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadLeads = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);

    listLeads({ limit: DASHBOARD_LEAD_SAMPLE_SIZE, sortBy: "createdAt", order: "desc" })
      .then((result) => {
        if (active) setLeads(result.leads);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadLeads(), [loadLeads]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(LEAD_STATUS_ORDER.map((status) => [status, 0])) as Record<
      LeadStatus,
      number
    >;
    for (const lead of leads) {
      counts[lead.status] += 1;
    }
    return counts;
  }, [leads]);

  const createdDates = useMemo(() => leads.map((lead) => lead.createdAt), [leads]);
  const latestLeads = leads.slice(0, 5);

  if (loading) {
    return <LoadingState minHeight="60vh" />;
  }

  if (error) {
    return <ErrorState message="We couldn't load your dashboard data." onRetry={loadLeads} />;
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here's what's happening with your pipeline.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/leads/new" variant="contained" startIcon={<AddIcon />}>
          New Lead
        </Button>
      </Stack>

      {/* KPI row: Total + one card per pipeline status. A CSS grid with an
          equal-fraction track count means all seven cards sit in one tidy row
          on desktop (a plain 12-col Grid can't divide evenly by 7) and reflow
          to 3/2 columns on smaller screens. */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(4, 1fr)",
            lg: "repeat(7, 1fr)",
          },
        }}
      >
        <StatCard
          label="Total Leads"
          value={String(leads.length)}
          accentColor="#4F46E5"
          caption="all leads"
        />
        {KPI_STATUSES.map((status) => {
          const count = statusCounts[status];
          const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
          return (
            <StatCard
              key={status}
              label={LEAD_STATUS_LABEL[status]}
              value={String(count)}
              accentColor={LEAD_STATUS_HEX[status]}
              caption={`${pct}% of total`}
            />
          );
        })}
      </Box>

      {/* Donut + latest leads */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Leads by status
              </Typography>
              <Box sx={{ mt: 2.5 }}>
                <LeadsStatusDonut counts={statusCounts} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Latest leads
                </Typography>
                <Button component={RouterLink} to="/leads" size="small">
                  View all
                </Button>
              </Stack>

              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {latestLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        hover
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{lead.name}</TableCell>
                        <TableCell>
                          <StatusChip status={lead.status} />
                        </TableCell>
                        <TableCell>{formatDate(lead.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {latestLeads.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{ py: 4, color: "text.secondary" }}
                        >
                          No leads yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leads over time */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Leads over time
          </Typography>
          <Box sx={{ mt: 1 }}>
            <LeadsOverTimeChart createdDates={createdDates} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
