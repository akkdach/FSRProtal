import React from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { TopBar } from '../components/TopBar';
import { Sidebar } from '../components/Sidebar';

interface AppLayoutProps {
    children: React.ReactNode;
    onNavigate?: (path: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onNavigate }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

    React.useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    const handleMenuClick = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleSidebarClose = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <TopBar onMenuClick={handleMenuClick} />
            <Sidebar open={sidebarOpen} onClose={handleSidebarClose} isMobile={isMobile} onNavigate={onNavigate} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 2, md: 3 },
                    width: { sm: `calc(100% - ${sidebarOpen && !isMobile ? '240px' : '0px'})` },
                    ml: { md: sidebarOpen ? '240px' : 0 },
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Toolbar />
                <Box sx={{ flexGrow: 1, mt: 2 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};
