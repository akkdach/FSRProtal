import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface TopBarProps {
    onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1.5,
                            fontWeight: 700,
                            fontSize: '1.2rem',
                        }}
                    >
                        FSR
                    </Box>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                        {t('app.title')}
                    </Typography>
                </Box>

                <LanguageSwitcher />

                <IconButton color="inherit" onClick={handleProfileClick}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
                        <AccountCircleIcon />
                    </Avatar>
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <MenuItem onClick={handleClose}>
                        <AccountCircleIcon sx={{ mr: 1 }} />
                        {t('user.profile')}
                    </MenuItem>
                    <MenuItem onClick={handleClose}>
                        <SettingsIcon sx={{ mr: 1 }} />
                        {t('user.settings')}
                    </MenuItem>
                    <MenuItem onClick={handleClose}>
                        <LogoutIcon sx={{ mr: 1 }} />
                        {t('user.logout')}
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
};
