import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { metricsData } from '../data/mockData';

export const MetricCards: React.FC = () => {
    const metrics = [
        {
            title: 'งานที่เสร็จสิ้น',
            value: metricsData.completedJobs,
            icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
            color: '#4caf50',
            trend: '+12%',
        },
        {
            title: 'งานที่รออนุมัติ',
            value: metricsData.pendingApprovals,
            icon: <PendingActionsIcon sx={{ fontSize: 40 }} />,
            color: '#ff9800',
            trend: '-3%',
        },
        {
            title: 'ช่างที่ทำงานอยู่',
            value: metricsData.activeTechnicians,
            icon: <EngineeringIcon sx={{ fontSize: 40 }} />,
            color: '#1976d2',
            trend: '+5%',
        },
    ];

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {metrics.map((metric, index) => (
                <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' }, minWidth: 0 }}>
                    <Card
                        sx={{
                            height: '100%',
                            background: `linear-gradient(135deg, ${metric.color}15 0%, ${metric.color}05 100%)`,
                            border: `1px solid ${metric.color}30`,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 8px 16px ${metric.color}30`,
                            },
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {metric.title}
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: metric.color, mb: 1 }}>
                                        {metric.value}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TrendingUpIcon sx={{ fontSize: 16, color: metric.trend.startsWith('+') ? '#4caf50' : '#f44336' }} />
                                        <Typography variant="caption" sx={{ color: metric.trend.startsWith('+') ? '#4caf50' : '#f44336' }}>
                                            {metric.trend} จากเดือนที่แล้ว
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box
                                    sx={{
                                        color: metric.color,
                                        backgroundColor: `${metric.color}20`,
                                        borderRadius: 2,
                                        p: 1,
                                    }}
                                >
                                    {metric.icon}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            ))}
        </Box>
    );
};
