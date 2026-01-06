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
    TablePagination,
    Chip,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Button,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { purchaseOrders } from '../data/ascMockData';
import type { PurchaseOrder } from '../data/ascModels';

export const POManagement: React.FC = () => {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [modelFilter, setModelFilter] = React.useState<string>('ทั้งหมด');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('ทั้งหมด');
    const [zoneFilter, setZoneFilter] = React.useState<string>('ทั้งหมด');
    const [warrantyFilter, setWarrantyFilter] = React.useState<string>('ทั้งหมด');
    const [provinceFilter, setProvinceFilter] = React.useState<string>('ทั้งหมด');

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Completed':
                return 'success';
            case 'In Progress':
                return 'info';
            case 'Open':
                return 'warning';
            case 'Cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getCategoryColor = (category: PurchaseOrder['category']) => {
        switch (category) {
            case 'OI':
                return '#1976d2';
            case 'VL':
                return '#4caf50';
            case 'Milk Device':
                return '#ff9800';
            case 'B2B':
                return '#9c27b0';
            default:
                return '#757575';
        }
    };

    const filteredData = purchaseOrders.filter((po) => {
        const matchesSearch =
            po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.model.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesModel = modelFilter === 'ทั้งหมด' || po.model === modelFilter;
        const matchesCategory = categoryFilter === 'ทั้งหมด' || po.category === categoryFilter;
        const matchesZone = zoneFilter === 'ทั้งหมด' || po.zone === zoneFilter;
        const matchesWarranty = warrantyFilter === 'ทั้งหมด' || po.warrantyType === warrantyFilter;
        const matchesProvince = provinceFilter === 'ทั้งหมด' || po.province === provinceFilter;

        return matchesSearch && matchesModel && matchesCategory && matchesZone && matchesWarranty && matchesProvince;
    });

    const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // Get unique values for filters
    const models = ['ทั้งหมด', ...Array.from(new Set(purchaseOrders.map((po) => po.model)))];
    const categories = ['ทั้งหมด', 'OI', 'VL', 'Milk Device', 'B2B'];
    const zones = ['ทั้งหมด', 'BKK', 'UPC'];
    const warranties = ['ทั้งหมด', 'Standard', 'Extended', 'Out of Warranty'];
    const provinces = ['ทั้งหมด', ...Array.from(new Set(purchaseOrders.map((po) => po.province)))];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    PO Management
                </Typography>
                <Button variant="contained" startIcon={<FileDownloadIcon />}>
                    Export Excel
                </Button>
            </Box>

            <Card>
                <CardContent>
                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <TextField
                            label="ค้นหา"
                            variant="outlined"
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ minWidth: 200, flexGrow: 1 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Model</InputLabel>
                            <Select value={modelFilter} label="Model" onChange={(e) => setModelFilter(e.target.value)}>
                                {models.map((model) => (
                                    <MenuItem key={model} value={model}>
                                        {model}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Category</InputLabel>
                            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                                {categories.map((cat) => (
                                    <MenuItem key={cat} value={cat}>
                                        {cat}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Zone</InputLabel>
                            <Select value={zoneFilter} label="Zone" onChange={(e) => setZoneFilter(e.target.value)}>
                                {zones.map((zone) => (
                                    <MenuItem key={zone} value={zone}>
                                        {zone}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Warranty</InputLabel>
                            <Select value={warrantyFilter} label="Warranty" onChange={(e) => setWarrantyFilter(e.target.value)}>
                                {warranties.map((warranty) => (
                                    <MenuItem key={warranty} value={warranty}>
                                        {warranty}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>จังหวัด</InputLabel>
                            <Select value={provinceFilter} label="จังหวัด" onChange={(e) => setProvinceFilter(e.target.value)}>
                                {provinces.map((province) => (
                                    <MenuItem key={province} value={province}>
                                        {province}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Results Summary */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        แสดง {filteredData.length} รายการจากทั้งหมด {purchaseOrders.length} รายการ
                    </Typography>

                    {/* Table */}
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>PO Number</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Model</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Zone</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>จังหวัด</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Warranty</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>ลูกค้า</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>จำนวนเงิน</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่สร้าง</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedData.map((po) => (
                                    <TableRow
                                        key={po.id}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 500 }}>{po.poNumber}</TableCell>
                                        <TableCell>{po.model}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={po.category}
                                                size="small"
                                                sx={{
                                                    backgroundColor: `${getCategoryColor(po.category)}20`,
                                                    color: getCategoryColor(po.category),
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={po.zone} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{po.province}</TableCell>
                                        <TableCell>
                                            <Chip label={po.warrantyType} size="small" color="default" />
                                        </TableCell>
                                        <TableCell>{po.customerName}</TableCell>
                                        <TableCell>฿{po.totalAmount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Chip label={po.status} color={getStatusColor(po.status)} size="small" />
                                        </TableCell>
                                        <TableCell>{new Date(po.createdDate).toLocaleDateString('th-TH')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={filteredData.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="แถวต่อหน้า:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                    />
                </CardContent>
            </Card>
        </Box>
    );
};
