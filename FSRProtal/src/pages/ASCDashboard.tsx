import React from 'react';
import { Box, Card, CardContent, Typography, Alert } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { dashboardMetrics, monthlyTrends } from '../data/ascMockData';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export const ASCDashboard: React.FC = () => {
    const metrics = [
        {
            title: 'PO ทั้งหมด',
            value: dashboardMetrics.totalPOs,
            icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
            color: '#1976d2',
            trend: '+8%',
        },
        {
            title: 'งานที่เปิดอยู่',
            value: dashboardMetrics.openJobs,
            icon: <BuildIcon sx={{ fontSize: 40 }} />,
            color: '#ff9800',
            trend: '-5%',
        },
        {
            title: 'Stock ต่ำ',
            value: dashboardMetrics.lowStockAlerts,
            icon: <WarningIcon sx={{ fontSize: 40 }} />,
            color: '#f44336',
            trend: '+2',
        },
        {
            title: 'Stock เกิน',
            value: dashboardMetrics.excessStockAlerts,
            icon: <InventoryIcon sx={{ fontSize: 40 }} />,
            color: '#ff9800',
            trend: '-1',
        },
        {
            title: 'Turnaround เฉลี่ย (ชม.)',
            value: dashboardMetrics.avgTurnaroundTime,
            icon: <AccessTimeIcon sx={{ fontSize: 40 }} />,
            color: '#4caf50',
            trend: '-3ชม.',
        },
        {
            title: 'ค่าใช้จ่ายเดือนนี้',
            value: `฿${(dashboardMetrics.totalCostThisMonth / 1000).toFixed(0)}K`,
            icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
            color: '#9c27b0',
            trend: '+12%',
        },
        {
            title: 'NTF Cases',
            value: dashboardMetrics.ntfCount,
            icon: <ReportProblemIcon sx={{ fontSize: 40 }} />,
            color: '#00bcd4',
            trend: '+1',
        },
        {
            title: 'Complaints',
            value: dashboardMetrics.activeComplaints,
            icon: <ReportProblemIcon sx={{ fontSize: 40 }} />,
            color: '#f44336',
            trend: '-2',
        },
    ];

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                ASC Programs Dashboard
            </Typography>

            {/* Alerts */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dashboardMetrics.lowStockAlerts > 0 && (
                    <Alert severity="error" icon={<WarningIcon />}>
                        <strong>แจ้งเตือน:</strong> มีอะไหล่ {dashboardMetrics.lowStockAlerts} รายการที่ stock ต่ำกว่า 4 เดือน
                    </Alert>
                )}
                {dashboardMetrics.excessStockAlerts > 0 && (
                    <Alert severity="warning" icon={<InventoryIcon />}>
                        <strong>แจ้งเตือน:</strong> มีอะไหล่ {dashboardMetrics.excessStockAlerts} รายการที่ stock เกิน 6 เดือน
                    </Alert>
                )}
            </Box>

            {/* Metrics Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                {metrics.map((metric, index) => (
                    <Box
                        key={index}
                        sx={{
                            flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' },
                            minWidth: 0,
                        }}
                    >
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
                                            <TrendingUpIcon
                                                sx={{
                                                    fontSize: 16,
                                                    color: metric.trend.startsWith('+') || metric.trend.startsWith('-')
                                                        ? (metric.trend.includes('-') && !metric.trend.includes('ชม.') ? '#4caf50' : '#ff9800')
                                                        : '#757575',
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: metric.trend.startsWith('+') || metric.trend.startsWith('-')
                                                        ? (metric.trend.includes('-') && !metric.trend.includes('ชม.') ? '#4caf50' : '#ff9800')
                                                        : '#757575',
                                                }}
                                            >
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

            {/* Charts */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Monthly Trends */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                            แนวโน้มรายเดือน
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#757575" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#757575" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 8,
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="totalJobs"
                                    stroke="#1976d2"
                                    strokeWidth={2}
                                    name="งานทั้งหมด"
                                    dot={{ fill: '#1976d2', r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="completedJobs"
                                    stroke="#4caf50"
                                    strokeWidth={2}
                                    name="งานเสร็จ"
                                    dot={{ fill: '#4caf50', r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ntfCount"
                                    stroke="#ff9800"
                                    strokeWidth={2}
                                    name="NTF"
                                    dot={{ fill: '#ff9800', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cost and Parts Usage */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                            ค่าใช้จ่ายและการใช้อะไหล่
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#757575" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#757575" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 8,
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="avgCost" fill="#9c27b0" name="ค่าใช้จ่ายเฉลี่ย (฿)" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="partsUsage" fill="#00bcd4" name="การใช้อะไหล่" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};
