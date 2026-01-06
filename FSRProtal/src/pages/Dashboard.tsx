import React from 'react';
import { Box } from '@mui/material';
import { MetricCards } from '../components/MetricCards';
import { ReportsTable } from '../components/ReportsTable';
import { PerformanceChart } from '../components/PerformanceChart';

export const Dashboard: React.FC = () => {
    return (
        <Box>
            <MetricCards />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
                <PerformanceChart />
                <ReportsTable />
            </Box>
        </Box>
    );
};
