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
    Alert,
    AlertTitle,
} from '@mui/material';
import { complaints } from '../data/ascMockData';
import type { ComplaintRecord } from '../data/ascModels';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export const ComplaintsAnalysis: React.FC = () => {
    const [statusFilter, setStatusFilter] = React.useState<string>('ทั้งหมด');
    const [typeFilter, setTypeFilter] = React.useState<string>('ทั้งหมด');

    const getStatusColor = (status: ComplaintRecord['status']) => {
        switch (status) {
            case 'Resolved':
                return 'success';
            case 'Closed':
                return 'default';
            case 'Investigating':
                return 'warning';
            case 'Open':
                return 'error';
            default:
                return 'default';
        }
    };

    const filteredComplaints = complaints.filter((complaint) => {
        const matchesStatus = statusFilter === 'ทั้งหมด' || complaint.status === statusFilter;
        const matchesType = typeFilter === 'ทั้งหมด' || complaint.complaintType === typeFilter;
        return matchesStatus && matchesType;
    });

    // Statistics
    const totalComplaints = complaints.length;
    const openComplaints = complaints.filter((c) => c.status === 'Open' || c.status === 'Investigating').length;
    const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length;
    const closedComplaints = complaints.filter((c) => c.status === 'Closed').length;

    // Complaint Type Distribution
    const typeDistribution = Array.from(
        new Set(complaints.map((c) => c.complaintType))
    ).map((type) => ({
        name: type,
        value: complaints.filter((c) => c.complaintType === type).length,
    }));

    const COLORS = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'];

    // Root Cause Analysis
    const rootCauseData = Array.from(
        new Set(complaints.map((c) => c.rootCause))
    ).map((cause) => ({
        cause: cause,
        count: complaints.filter((c) => c.rootCause === cause).length,
    }));

    // Category Analysis
    const categoryData = [
        { category: 'OI', count: complaints.filter((c) => c.category === 'OI').length },
        { category: 'VL', count: complaints.filter((c) => c.category === 'VL').length },
        { category: 'Milk Device', count: complaints.filter((c) => c.category === 'Milk Device').length },
        { category: 'B2B', count: complaints.filter((c) => c.category === 'B2B').length },
    ].filter((item) => item.count > 0);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Complaints Analysis
            </Typography>

            {/* Alert for Open Complaints */}
            {openComplaints > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <AlertTitle>แจ้งเตือน</AlertTitle>
                    มี <strong>{openComplaints} รายการ</strong> ที่ยังไม่ได้รับการแก้ไข - ต้องดำเนินการด่วน!
                </Alert>
            )}

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                {[
                    { label: 'ร้องเรียนทั้งหมด', value: totalComplaints, color: '#1976d2' },
                    { label: 'เปิดอยู่/กำลังตรวจสอบ', value: openComplaints, color: '#ff9800' },
                    { label: 'แก้ไขแล้ว', value: resolvedComplaints, color: '#4caf50' },
                    { label: 'ปิดแล้ว', value: closedComplaints, color: '#757575' },
                ].map((item, index) => (
                    <Card
                        key={index}
                        sx={{
                            flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' },
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
                {/* Complaint Type Distribution */}
                <Card sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            ประเภทการร้องเรียน
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={typeDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {typeDistribution.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Root Cause Analysis */}
                <Card sx={{ flex: '1 1 calc(50% - 12px)', minWidth: 300 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Root Cause Analysis
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={rootCauseData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="cause" type="category" width={150} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#f44336" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Box>

            {/* Category Distribution */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        การร้องเรียนตาม Category
                    </Typography>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={categoryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#1976d2" name="จำนวนการร้องเรียน" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Complaints Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        รายการร้องเรียนทั้งหมด
                    </Typography>

                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>สถานะ</InputLabel>
                            <Select value={statusFilter} label="สถานะ" onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="Investigating">Investigating</MenuItem>
                                <MenuItem value="Resolved">Resolved</MenuItem>
                                <MenuItem value="Closed">Closed</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>ประเภท</InputLabel>
                            <Select value={typeFilter} label="ประเภท" onChange={(e) => setTypeFilter(e.target.value)}>
                                <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                                {Array.from(new Set(complaints.map((c) => c.complaintType))).map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Complaint #</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>PU ID</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Model</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ประเภท</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Root Cause</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>รายละเอียด</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่รายงาน</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่แก้ไข</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredComplaints.map((complaint) => (
                                    <TableRow
                                        key={complaint.id}
                                        sx={{
                                            '&:hover': { backgroundColor: 'action.hover' },
                                            backgroundColor:
                                                complaint.status === 'Open'
                                                    ? '#ffebee'
                                                    : complaint.status === 'Investigating'
                                                        ? '#fff3e0'
                                                        : 'transparent',
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 500 }}>{complaint.complaintNumber}</TableCell>
                                        <TableCell>{complaint.puId}</TableCell>
                                        <TableCell>{complaint.model}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={complaint.category}
                                                size="small"
                                                sx={{
                                                    backgroundColor:
                                                        complaint.category === 'OI'
                                                            ? '#1976d220'
                                                            : complaint.category === 'VL'
                                                                ? '#4caf5020'
                                                                : complaint.category === 'Milk Device'
                                                                    ? '#ff980020'
                                                                    : '#9c27b020',
                                                    color:
                                                        complaint.category === 'OI'
                                                            ? '#1976d2'
                                                            : complaint.category === 'VL'
                                                                ? '#4caf50'
                                                                : complaint.category === 'Milk Device'
                                                                    ? '#ff9800'
                                                                    : '#9c27b0',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{complaint.complaintType}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={complaint.rootCause}
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="body2" noWrap>
                                                {complaint.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{new Date(complaint.reportedDate).toLocaleDateString('th-TH')}</TableCell>
                                        <TableCell>
                                            {complaint.resolvedDate
                                                ? new Date(complaint.resolvedDate).toLocaleDateString('th-TH')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={complaint.status} color={getStatusColor(complaint.status)} size="small" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Summary */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                            สรุป
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            แสดง {filteredComplaints.length} รายการจากทั้งหมด {complaints.length} รายการ
                        </Typography>
                        {openComplaints > 0 && (
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                ⚠️ มี {openComplaints} รายการที่ต้องดำเนินการ
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
