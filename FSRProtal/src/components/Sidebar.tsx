import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Divider,
    Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WorkIcon from '@mui/icons-material/Work';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import InventoryIcon from '@mui/icons-material/Inventory';
import BuildIcon from '@mui/icons-material/Build';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    isMobile: boolean;
    onNavigate?: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, isMobile, onNavigate }) => {
    const { t } = useTranslation();
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const menuItems = [
        { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/' },
        { text: t('nav.reports'), icon: <AssessmentIcon />, path: '/reports' },
        { text: t('nav.jobs'), icon: <WorkIcon />, path: '/jobs' },
        { text: t('nav.technicians'), icon: <EngineeringIcon />, path: '/technicians' },
        { text: t('nav.settings'), icon: <SettingsIcon />, path: '/settings' },
    ];

    const ascMenuItems = [
        { text: t('nav.ascDashboard'), icon: <DashboardIcon />, path: '/asc' },
        { text: t('nav.poManagement'), icon: <BusinessCenterIcon />, path: '/asc/po' },
        { text: t('nav.partsInventory'), icon: <InventoryIcon />, path: '/asc/parts' },
        { text: t('nav.serviceJobs'), icon: <BuildIcon />, path: '/asc/jobs' },
        { text: t('nav.complaints'), icon: <ReportProblemIcon />, path: '/asc/complaints' },
    ];

    const handleListItemClick = (index: number, path: string) => {
        setSelectedIndex(index);
        if (onNavigate) {
            onNavigate(path);
        }
        if (isMobile) {
            onClose();
        }
    };

    const drawerContent = (
        <Box>
            <Toolbar />
            <List>
                {menuItems.map((item, index) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={selectedIndex === index}
                            onClick={() => handleListItemClick(index, item.path)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: 'white',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    color: selectedIndex === index ? 'white' : 'inherit',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {t('nav.ascPrograms')}
                </Typography>
            </Box>

            <List>
                {ascMenuItems.map((item, index) => {
                    const globalIndex = menuItems.length + index;
                    return (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                selected={selectedIndex === globalIndex}
                                onClick={() => handleListItemClick(globalIndex, item.path)}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: 'white',
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: selectedIndex === globalIndex ? 'white' : 'inherit',
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <>
            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={open}
                    onClose={onClose}
                    ModalProps={{
                        keepMounted: true, // Better mobile performance
                    }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <Drawer
                    variant="persistent"
                    open={open}
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}
        </>
    );
};
