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
    Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { sparePartsInventory } from '../data/ascMockData';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export const PartsInventory: React.FC = () => {
    const getStockStatus = (coverageMonths: number) => {
        if (coverageMonths < 4) {
            return { label: 'ต่ำ', color: 'error', icon: <ErrorIcon /> };
        } else if (coverageMonths > 6) {
            return { label: 'เกิน', color: 'warning', icon: <WarningIcon /> };
        } else {
            return { label: 'ปกติ', color: 'success', icon: <CheckCircleIcon /> };
        }
    };

    const lowStockItems = sparePartsInventory.filter((item) => item.stockCoverageMonths < 4);
    const excessStockItems = sparePartsInventory.filter((item) => item.stockCoverageMonths > 6);

    // Prepare chart data
    const chartData = sparePartsInventory.map((item) => ({
        name: item.partName.substring(0, 15) + '...',
        'Stock ปัจจุบัน': item.currentStock,
        'ใช้เฉลี่ย/เดือน': item.monthlyAverageUsage,
        'Min Stock': item.minStock,
        'Max Stock': item.maxStock,
    }));

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Parts Inventory Management
            </Typography>

            {/* Alerts */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {lowStockItems.length > 0 && (
                    <Alert severity="error" icon={<ErrorIcon />}>
                        <strong>Stock ต่ำ:</strong> มีอะไหล่ {lowStockItems.length} รายการที่ stock coverage ต่ำกว่า 4 เดือน
                        - ต้องสั่งซื้อด่วน!
                    </Alert>
                )}
                {excessStockItems.length > 0 && (
                    <Alert severity="warning" icon={<WarningIcon />}>
                        <strong>Stock เกิน:</strong> มีอะไหล่ {excessStockItems.length} รายการที่ stock coverage เกิน 6 เดือน
                        - พิจารณาลดการสั่งซื้อ
                    </Alert>
                )}
            </Box>

            {/* Stock Coverage Chart */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        Stock Coverage Overview
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                            <YAxis tick={{ fontSize: 12 }} stroke="#757575" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                }}
                            />
                            <Legend />
                            <Bar dataKey="Stock ปัจจุบัน" fill="#1976d2" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="ใช้เฉลี่ย/เดือน" fill="#4caf50" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="Min Stock" fill="#ff9800" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="Max Stock" fill="#f44336" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        รายการอะไหล่ทั้งหมด
                    </Typography>

                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>SKU</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ชื่ออะไหล่</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Model</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Stock ปัจจุบัน</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ใช้เฉลี่ย/เดือน</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Coverage (เดือน)</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>In เดือนนี้</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Out เดือนนี้</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ราคา/หน่วย</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>มูลค่ารวม</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>แนะนำสั่งซื้อ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sparePartsInventory.map((item) => {
                                    const status = getStockStatus(item.stockCoverageMonths);
                                    return (
                                        <TableRow
                                            key={item.id}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'action.hover',
                                                },
                                                backgroundColor:
                                                    item.stockCoverageMonths < 4
                                                        ? '#ffebee'
                                                        : item.stockCoverageMonths > 6
                                                            ? '#fff3e0'
                                                            : 'transparent',
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 500 }}>{item.sku}</TableCell>
                                            <TableCell>{item.partName}</TableCell>
                                            <TableCell>{item.model}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        color:
                                                            item.stockCoverageMonths < 4
                                                                ? '#f44336'
                                                                : item.stockCoverageMonths > 6
                                                                    ? '#ff9800'
                                                                    : '#4caf50',
                                                    }}
                                                >
                                                    {item.currentStock}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{item.monthlyAverageUsage}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        color:
                                                            item.stockCoverageMonths < 4
                                                                ? '#f44336'
                                                                : item.stockCoverageMonths > 6
                                                                    ? '#ff9800'
                                                                    : '#4caf50',
                                                    }}
                                                >
                                                    {item.stockCoverageMonths.toFixed(1)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={status.label}
                                                    color={status.color as any}
                                                    size="small"
                                                    icon={status.icon}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={`+${item.inThisMonth}`} size="small" color="success" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={`-${item.outThisMonth}`} size="small" color="error" />
                                            </TableCell>
                                            <TableCell>฿{item.unitPrice.toLocaleString()}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>฿{item.totalValue.toLocaleString()}</TableCell>
                                            <TableCell>
                                                {item.nextPurchaseRecommendation ? (
                                                    <Chip
                                                        label={new Date(item.nextPurchaseRecommendation).toLocaleDateString('th-TH', {
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                        size="small"
                                                        color="warning"
                                                    />
                                                ) : (
                                                    <Chip label="ไม่ต้องสั่ง" size="small" color="default" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Summary */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                            สรุป
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    มูลค่า Stock รวม
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                                    ฿{sparePartsInventory.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    รายการทั้งหมด
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {sparePartsInventory.length} รายการ
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Stock ต่ำ (ต้องสั่ง)
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336' }}>
                                    {lowStockItems.length} รายการ
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Stock เกิน
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                                    {excessStockItems.length} รายการ
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
