/**
 * Admin Page (REQ-111)
 *
 * Dashboard for admins to manage registration requests, invites, and users.
 * Responsive design with mobile-first approach.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../hooks/useAuth';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { PendingRequestsList } from '../components/admin/PendingRequestsList';
import { InvitesList } from '../components/admin/InvitesList';
import { UsersList } from '../components/admin/UsersList';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/theme';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { user, firebaseReady } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();
  const [activeTab, setActiveTab] = useState(0);

  // Redirect if not admin (only after fully loaded and authenticated)
  useEffect(() => {
    // Wait until everything is ready before redirecting
    if (firebaseReady && !adminLoading && user && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAdmin, adminLoading, navigate, firebaseReady, user]);

  // Loading state
  if (!firebaseReady || adminLoading) {
    return (
      <AdminLayout isMobile={isMobile}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <AdminLayout isMobile={isMobile}>
        <Typography color="text.secondary">
          Please sign in to access the admin dashboard.
        </Typography>
      </AdminLayout>
    );
  }

  // Not admin (should redirect, but show fallback)
  if (!isAdmin) {
    return (
      <AdminLayout isMobile={isMobile}>
        <Typography color="text.secondary">
          You do not have admin access.
        </Typography>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout isMobile={isMobile}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={isMobile ? 'Requests' : 'Pending Requests'} />
          <Tab label="Invites" />
          <Tab label="Users" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <PendingRequestsList />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <InvitesList />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <UsersList />
      </TabPanel>
    </AdminLayout>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  isMobile?: boolean;
}

function AdminLayout({ children, isMobile = false }: AdminLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppHeader />
      <Box sx={{ p: isMobile ? 1 : 2 }}>
        <Card sx={{ maxWidth: isMobile ? '100%' : 900, mx: 'auto' }}>
          <Box
            sx={{
              bgcolor: colors.oceanBlue,
              color: 'white',
              px: isMobile ? 2 : 3,
              py: isMobile ? 1.5 : 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AdminPanelSettingsIcon />
            <Typography variant={isMobile ? 'subtitle1' : 'h6'}>
              Admin Dashboard
            </Typography>
          </Box>
          <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>{children}</CardContent>
        </Card>
      </Box>
    </Box>
  );
}
