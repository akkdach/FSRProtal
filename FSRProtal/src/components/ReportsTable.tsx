import React from 'react';
import {
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
    IconButton,
    Box,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { reportsData, type ReportData } from '../data/mockData';

export const ReportsTable: React.FC = () => {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('ทั้งหมด');

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusColor = (status: ReportData['status']) => {
        switch (status) {
            case 'เสร็จสิ้น':
                return 'success';
            case 'รออนุมัติ':
                return 'warning';
            case 'กำลังดำเนินการ':
                return 'info';
            case 'ยกเลิก':
                return 'error';
            default:
                return 'default';
        }
    };

    const filteredData = reportsData.filter((report) => {
        const matchesSearch =
            report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.customer.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ทั้งหมด' || report.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const paginatedData = filteredData.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    รายงานล่าสุด
                </Typography>

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
                        <InputLabel>สถานะ</InputLabel>
                        <Select
                            value={statusFilter}
                            label="สถานะ"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                            <MenuItem value="เสร็จสิ้น">เสร็จสิ้น</MenuItem>
                            <MenuItem value="รออนุมัติ">รออนุมัติ</MenuItem>
                            <MenuItem value="กำลังดำเนินการ">กำลังดำเนินการ</MenuItem>
                            <MenuItem value="ยกเลิก">ยกเลิก</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>รหัสรายงาน</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>ช่าง</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>ลูกค้า</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>ประเภทงาน</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 600 }}>การดำเนินการ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.map((report) => (
                                <TableRow
                                    key={report.id}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: 'action.hover',
                                        },
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 500 }}>{report.id}</TableCell>
                                    <TableCell>{report.technician}</TableCell>
                                    <TableCell>{report.customer}</TableCell>
                                    <TableCell>{report.jobType}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={report.status}
                                            color={getStatusColor(report.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{new Date(report.date).toLocaleDateString('th-TH')}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="primary">
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="secondary">
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
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
    );
};
