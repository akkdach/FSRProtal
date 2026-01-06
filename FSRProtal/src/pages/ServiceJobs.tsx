import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    LinearProgress,
    Tooltip,
    IconButton,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { serviceJobs } from '../data/ascMockData';
import type { ServiceJob } from '../data/ascModels';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

export const ServiceJobs: React.FC = () => {
    const [statusFilter, setStatusFilter] = React.useState<string>('ทั้งหมด');
    const [repairCodeFilter, setRepairCodeFilter] = React.useState<string>('ทั้งหมด');
    const [warrantyFilter, setWarrantyFilter] = React.useState<string>('ทั้งหมด');

    const getStatusColor = (status: ServiceJob['status']) => {
        switch (status) {
            case 'Completed':
                return 'success';
            case 'In Repair':
                return 'info';
            case 'Waiting Return':
                return 'warning';
            case 'Waiting Close':
                return 'warning';
            case 'Waiting Pickup':
                return 'default';
            default:
                return 'default';
        }
    };

    const getRepairCodeColor = (code: string) => {
        switch (code) {
            case '1':
                return '#4caf50';
            case '2':
                return '#ff9800';
            case '3':
                return '#f44336';
            default:
                return '#757575';
        }
    };

    const filteredJobs = serviceJobs.filter((job) => {
        const matchesStatus = statusFilter === 'ทั้งหมด' || job.status === statusFilter;
        const matchesRepairCode = repairCodeFilter === 'ทั้งหมด' || job.repairCode === repairCodeFilter;
        const matchesWarranty = warrantyFilter === 'ทั้งหมด' || job.warrantyType === warrantyFilter;
        return matchesStatus && matchesRepairCode && matchesWarranty;
    });

    // Calculate statistics
    const totalJobs = serviceJobs.length;
    const completedJobs = serviceJobs.filter((j) => j.status === 'Completed').length;
    const openJobs = serviceJobs.filter((j) => j.status !== 'Completed').length;
    const ntfJobs = serviceJobs.filter((j) => j.isNTF).length;
    const avgTurnaround = serviceJobs
        .filter((j) => j.turnaroundTime)
        .reduce((sum, j) => sum + (j.turnaroundTime || 0), 0) / serviceJobs.filter((j) => j.turnaroundTime).length;
    const totalCost = serviceJobs.reduce((sum, j) => sum + j.totalCost, 0);

    // Repair code distribution
    const repairCodeData = [
        { name: 'Repair Code 1', value: serviceJobs.filter((j) => j.repairCode === '1').length, color: '#4caf50' },
        { name: 'Repair Code 2', value: serviceJobs.filter((j) => j.repairCode === '2').length, color: '#ff9800' },
        { name: 'Repair Code 3', value: serviceJobs.filter((j) => j.repairCode === '3').length, color: '#f44336' },
    ];

    // Status distribution
    const statusData = [
        { status: 'Completed', count: serviceJobs.filter((j) => j.status === 'Completed').length },
        { status: 'In Repair', count: serviceJobs.filter((j) => j.status === 'In Repair').length },
        { status: 'Waiting Return', count: serviceJobs.filter((j) => j.status === 'Waiting Return').length },
        { status: 'Waiting Close', count: serviceJobs.filter((j) => j.status === 'Waiting Close').length },
    ];

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Service Jobs Management
            </Typography>

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                {[
                    { label: 'งานทั้งหมด', value: totalJobs, color: '#1976d2' },
                    { label: 'งานเสร็จสิ้น', value: completedJobs, color: '#4caf50' },
                    { label: 'งานเปิดอยู่', value: openJobs, color: '#ff9800' },
                    { label: 'NTF Cases', value: ntfJobs, color: '#00bcd4' },
                    { label: 'Turnaround เฉลี่ย', value: `${avgTurnaround.toFixed(1)}h`, color: '#9c27b0' },
                    { label: 'ค่าใช้จ่ายรวม', value: `฿${(totalCost / 1000).toFixed(0)}K`, color: '#f44336' },
                ].map((item, index) => (
                    <Card
                        key={index}
                        sx={{
                            flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 11px)', md: '1 1 calc(16.666% - 13px)' },
                            minWidth: 0,
                            background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
                            border: `1px solid ${item.color}30`,
                        }}
                    >
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                {item.label}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: item.color }}>
                                {item.value}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Charts */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <Card sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Repair Code Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={repairCodeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {repairCodeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Job Status Overview
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#1976d2" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Box>

            {/* Jobs Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        รายการงานทั้งหมด
                    </Typography>

                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>สถานะ</InputLabel>
                            <Select value={statusFilter} label="สถานะ" onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                                <MenuItem value="Completed">Completed</MenuItem>
                                <MenuItem value="In Repair">In Repair</MenuItem>
                                <MenuItem value="Waiting Return">Waiting Return</MenuItem>
                                <MenuItem value="Waiting Close">Waiting Close</MenuItem>
                                <MenuItem value="Waiting Pickup">Waiting Pickup</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Repair Code</InputLabel>
                            <Select value={repairCodeFilter} label="Repair Code" onChange={(e) => setRepairCodeFilter(e.target.value)}>
                                <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                                <MenuItem value="1">Code 1</MenuItem>
                                <MenuItem value="2">Code 2</MenuItem>
                                <MenuItem value="3">Code 3</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Warranty</InputLabel>
                            <Select value={warrantyFilter} label="Warranty" onChange={(e) => setWarrantyFilter(e.target.value)}>
                                <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                                <MenuItem value="In Warranty">In Warranty</MenuItem>
                                <MenuItem value="Out of Warranty">Out of Warranty</MenuItem>
                                <MenuItem value="Repair Warranty">Repair Warranty</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Job Number</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>PU ID</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Model</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Repair Code</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Warranty</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Turnaround (h)</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Labor Cost</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Parts Cost</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total Cost</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>NTF</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredJobs.map((job) => (
                                    <TableRow
                                        key={job.id}
                                        sx={{
                                            '&:hover': { backgroundColor: 'action.hover' },
                                            backgroundColor: job.isNTF ? '#e3f2fd' : 'transparent',
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 500 }}>{job.jobNumber}</TableCell>
                                        <TableCell>{job.puId}</TableCell>
                                        <TableCell>{job.model}</TableCell>
                                        <TableCell>
                                            <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`Code ${job.repairCode}`}
                                                size="small"
                                                sx={{
                                                    backgroundColor: `${getRepairCodeColor(job.repairCode)}20`,
                                                    color: getRepairCodeColor(job.repairCode),
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={job.warrantyType}
                                                size="small"
                                                color={job.warrantyType === 'In Warranty' ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {job.turnaroundTime ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {job.turnaroundTime}h
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min((job.turnaroundTime / 72) * 100, 100)}
                                                        sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                                        color={job.turnaroundTime < 48 ? 'success' : job.turnaroundTime < 72 ? 'warning' : 'error'}
                                                    />
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    In Progress
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>฿{job.laborCost.toLocaleString()}</TableCell>
                                        <TableCell>฿{job.partsCost.toLocaleString()}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>฿{job.totalCost.toLocaleString()}</TableCell>
                                        <TableCell>
                                            {job.isNTF && (
                                                <Chip label="NTF" size="small" color="info" sx={{ fontWeight: 600 }} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Details">
                                                <IconButton size="small" color="primary">
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {job.videoUrl && (
                                                <Tooltip title="View Video">
                                                    <IconButton size="small" color="secondary">
                                                        <PlayCircleOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};
