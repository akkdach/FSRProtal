import React from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageChange = (languageCode: string) => {
        i18n.changeLanguage(languageCode);
        handleClose();
    };

    return (
        <>
            <IconButton
                onClick={handleClick}
                sx={{
                    color: 'inherit',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                <LanguageIcon />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        minWidth: 180,
                    },
                }}
            >
                {languages.map((language) => (
                    <MenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        selected={language.code === i18n.language}
                    >
                        <ListItemIcon sx={{ fontSize: 24 }}>{language.flag}</ListItemIcon>
                        <ListItemText>{language.name}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
