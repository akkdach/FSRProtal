import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    ThemeProvider,
    createTheme,
    Button,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';

// Dark theme for MRT
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#1a1a2e',
            paper: '#16213e',
        },
        primary: {
            main: '#4fc3f7',
        },
    },
});

// Column header mapping for display names
const columnHeaderMap: Record<string, string> = {
    // Known fields
    bpc_notifdate: 'Pick-up Date',
    bpc_scheduledstart: 'Pick-up On',
    bpc_ticketno: 'Pick-up Nr',
    bpc_customerbranch: 'Third',
    bpc_zonegroup: 'Area',
    bpc_model: 'Machine Model', // Used for "Machine" or "Machine Model"? User has both "Machine" and "Machine Model" later. I'll map this to "Machine Model" and maybe "Machine" is something else?
    bpc_conditionid: 'Failure Code',
    bpc_resolutionid: 'Rep Code 1',
    bpc_serialnumber: 'Serial Nr',
    bpc_actualstartdate: 'Return Date', // "Return Date" appears twice in user list? "Return Date" and "Return Date Checking"?
    bpc_modelnodescription: 'Machine Type', // "Machine Type"
    bpc_slafinishdate: 'SLA', // "SLA"

    // Likely matches or placeholders
    loan_machine: 'Loan Machine',
    machine: 'Machine',
    failure_descr: 'Failure Descr',
    rep_code_1_descr: 'Rep Code 1 Descr',
    rep_code_2: 'Rep Code 2',
    rep_code_2_descr: 'Rep Code 2 Descr',
    rep_code_3: 'Rep Code 3',
    rep_code_3_descr: 'Rep Code 3 Descr',
    repair_comment: 'Repair Comment',
    text: 'Text',
    warranty_type: 'Warranty Type',
    warranty_type_description: 'Warranty Type Description',
    return_date_checking: 'Return Date Checking',
    sche_due_date: 'Pick up year',
    pick_up_month: 'Pick Up Month',
    return_month: 'Return Month',
    return_year: 'Return Year',
    return_date_checking_status: 'Return Date Checking Status',
    // return_date_checking duplicate?
    repair_code_checking: 'Repair code checking',
    final_repair_status: 'Final repair status',
    service_time_day: 'Service time (Day) (Count from pick up date - Now)',
    // Area already mapped
    asc_criteria: 'ASC criteria (Waiting time > 4,6)',
    exchange_criteria: 'Exchange criteria (Waiting time > 2 months)',
    // Machine Model already mapped
    // Machine Type already mapped
    // SLA already mapped
    actual_received_customer_machine_date: 'Actual received customer machine date',
    actual_repair_report_sending_date: 'Actual repair report sending date',
    loan_return_date: 'Loan return date',
    pick_up_time: 'Pick Up time',
    repair_time: 'Repair time',
    return_time: 'Return time',
    turnaround_time: 'Turnaround time',
    loan_return_time: 'Loan return time',
    turnaround_time_checking: 'Turnaround time checking',
};

export const POManagement: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [bn4DataMap, setBn4DataMap] = useState<Map<string, any>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [zoneFilter, setZoneFilter] = useState<string>('ทั้งหมด');
    const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด');
    const [modelFilter, setModelFilter] = useState<string>('ทั้งหมด');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [responseBN09, responseBN04] = await Promise.all([
                fetch('/api/fsr-protal/orders?view=Service_BN09_New'),
                fetch('/api/fsr-protal/orders?view=Service_BN4_New')
            ]);

            if (!responseBN09.ok) {
                console.warn("BN09 API might not exist locally");
            }
            if (!responseBN04.ok) {
                console.warn("BN04 API might not exist locally");
            }

            const resultBN09 = responseBN09.ok ? await responseBN09.json() : { data: [] };
            const resultBN04 = responseBN04.ok ? await responseBN04.json() : { data: [] };

            const dataBN09 = resultBN09.data || resultBN09;
            const dataBN04 = resultBN04.data || resultBN04;

            setData(dataBN09);

            // Create a map for BN04 data for faster lookup
            const map = new Map();
            if (Array.isArray(dataBN04)) {
                dataBN04.forEach((item: any) => {
                    if (item.bpc_ticketno) {
                        map.set(item.bpc_ticketno, item);
                    }
                });
            }
            setBn4DataMap(map);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get unique values for filters
    const zones = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(data.map((r) => r.bpc_zonegroup).filter(Boolean)))], [data]);
    // bpc_mobilestatus might correspond to Nespresso Status or similar
    const statuses = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(data.map((r) => r.bpc_mobilestatus).filter(Boolean)))], [data]);
    const models = useMemo(() => ['ทั้งหมด', ...Array.from(new Set(data.map((r) => r.bpc_model).filter(Boolean)))], [data]);

    // Filtered data
    const filteredData = useMemo(() => {
        return data.filter((record) => {
            const matchesSearch =
                searchTerm === '' ||
                (record.bpc_ticketno?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (record.bpc_customername?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (record.bpc_serialnumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (record.serviceorderid?.toLowerCase() || '').includes(searchTerm.toLowerCase());

            const matchesZone = zoneFilter === 'ทั้งหมด' || record.bpc_zonegroup === zoneFilter;
            const matchesStatus = statusFilter === 'ทั้งหมด' || record.bpc_mobilestatus === statusFilter;
            const matchesModel = modelFilter === 'ทั้งหมด' || record.bpc_model === modelFilter;

            return matchesSearch && matchesZone && matchesStatus && matchesModel;
        });
    }, [data, searchTerm, zoneFilter, statusFilter, modelFilter]);

    // Explicitly define the key order to guarantee the column sequence
    // Using mapping from user request
    const columnOrder = [
        'bpc_notifdate', // Pick-up Date
        'bpc_scheduledstart', // Pick-up On
        'bpc_ticketno', // Pick-up Nr
        'bpc_customerbranch', // Third
        'loan_machine',
        'bpc_zonegroup', // Area
        'machine',
        'bpc_conditionid', // Failure Code
        'failure_descr',
        'bpc_resolutionid', // Rep Code 1
        'rep_code_1_descr',
        'rep_code_2',
        'rep_code_2_descr',
        'rep_code_3',
        'rep_code_3_descr',
        'repair_comment',
        'text',
        'bpc_serialnumber', // Serial Nr
        'bpc_actualstartdate', // Return Date
        'warranty_type',
        'warranty_type_description',
        'return_date_checking',
        'sche_due_date',
        'pick_up_month',
        'return_month',
        'return_year',
        'return_date_checking_status',
        'repair_code_checking',
        'final_repair_status',
        'service_time_day',
        // 'bpc_zonegroup', // Area duplicate? User listed Area twice.
        'asc_criteria',
        'exchange_criteria',
        'bpc_model', // Machine Model
        'bpc_modelnodescription', // Machine Type
        // 'bpc_slafinishdate', // SLA - Removed
        'actual_received_customer_machine_date',
        'actual_repair_report_sending_date',
        'loan_return_date',
        'pick_up_time',
        'repair_time',
        'return_time',
        'turnaround_time',
        'loan_return_time',
        'turnaround_time_checking'
    ];

    // Dynamic columns based on the explicit order
    const columns = useMemo<MRT_ColumnDef<any>[]>(() => {
        return columnOrder.map((key) => {
            // Map specific keys to data fields if needed, otherwise use key as accessor
            let accessorKey = key;

            if (key === 'return_date_checking') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        // Look up in BN04 data
                        const bn4Record = bn4DataMap.get(row.bpc_ticketno);
                        // Prefer BN4 data, fallback to row data
                        return bn4Record ? bn4Record.bpc_scheduledstart : row.bpc_scheduledstart;
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        if (value === null || value === undefined) return '-';
                        if (typeof value === 'object') return JSON.stringify(value);
                        return String(value);
                    },
                };
            }
            if (key === 'bpc_actualstartdate') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        const bn4Record = bn4DataMap.get(row.bpc_ticketno);
                        // Prefer BN4 data, fallback to row data
                        return bn4Record ? bn4Record.bpc_actualstartdate : row.bpc_actualstartdate;
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        if (value === null || value === undefined) return '-';
                        if (typeof value === 'object') return JSON.stringify(value);
                        return String(value);
                    },
                };
            }

            if (key === 'sche_due_date') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        if (!row.bpc_scheduledstart) return '-';
                        try {
                            const date = new Date(row.bpc_scheduledstart);
                            if (isNaN(date.getTime())) return row.bpc_scheduledstart;
                            // Format to Year
                            return String(date.getFullYear());
                        } catch (e) {
                            return row.bpc_scheduledstart;
                        }
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        return String(value);
                    },
                };
            }

            if (key === 'pick_up_month') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        if (!row.bpc_scheduledstart) return '-';
                        try {
                            const date = new Date(row.bpc_scheduledstart);
                            // Verify if date is valid
                            if (isNaN(date.getTime())) return row.bpc_scheduledstart;
                            // Format to Month number (1-12)
                            return String(date.getMonth() + 1);
                        } catch (e) {
                            return row.bpc_scheduledstart;
                        }
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        return String(value);
                    },
                };
            }

            if (key === 'return_month') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        const bn4Record = bn4DataMap.get(row.bpc_ticketno);
                        if (!bn4Record || !bn4Record.bpc_scheduledstart) return '-';
                        try {
                            const date = new Date(bn4Record.bpc_scheduledstart);
                            if (isNaN(date.getTime())) return '-';
                            return String(date.getMonth() + 1);
                        } catch (e) { return '-'; }
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        return String(value);
                    },
                };
            }

            if (key === 'return_year') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        const bn4Record = bn4DataMap.get(row.bpc_ticketno);
                        if (!bn4Record || !bn4Record.bpc_scheduledstart) return '-';
                        try {
                            const date = new Date(bn4Record.bpc_scheduledstart);
                            if (isNaN(date.getTime())) return '-';
                            return String(date.getFullYear());
                        } catch (e) { return '-'; }
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 120,
                    size: 180,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        return String(value);
                    },
                };
            }

            if (key === 'return_date_checking_status') {
                return {
                    id: key,
                    accessorFn: (row) => {
                        // Check if Return Date Checking (BN04) exists
                        const bn4Record = bn4DataMap.get(row.bpc_ticketno);
                        const returnDateChecking = bn4Record ? bn4Record.bpc_scheduledstart : row.bpc_scheduledstart;
                        return returnDateChecking ? 'Done' : 'Waiting Return Date ';
                    },
                    header: columnHeaderMap[key] || key,
                    minSize: 150,
                    size: 200,
                    grow: true,
                    Header: ({ column }) => (
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {column.columnDef.header}
                        </span>
                    ),
                    Cell: ({ cell }) => {
                        const value = cell.getValue();
                        return (
                            <span style={{
                                color: value === 'Done' ? '#4caf50' : '#ff9800',
                                fontWeight: 'bold'
                            }}>
                                {String(value)}
                            </span>
                        );
                    },
                };
            }

            // Add other specific mappings here if known, e.g.
            // if (key === 'loan_machine') accessorKey = 'bpc_loanmachine';  

            return {
                id: key, // Use the original key as the unique ID
                accessorKey: accessorKey,
                header: columnHeaderMap[key] || key, // Fallback if not in map
                minSize: 120,
                size: 180,
                grow: true,
                Header: ({ column }) => (
                    <span style={{ whiteSpace: 'nowrap' }}>
                        {column.columnDef.header}
                    </span>
                ),
                Cell: ({ cell }) => {
                    const value = cell.getValue();
                    if (value === null || value === undefined) return '-';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return String(value);
                },
            };
        });
    }, [bn4DataMap]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Service BN09 - New
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
                            placeholder="Pick-up Nr, Customer, Serial..."
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Area</InputLabel>
                            <Select value={zoneFilter} label="Area" onChange={(e) => setZoneFilter(e.target.value)}>
                                {zones.map((zone) => (
                                    <MenuItem key={zone} value={zone}>
                                        {zone}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                                {statuses.map((status) => (
                                    <MenuItem key={status} value={status}>
                                        {status}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
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
                    </Box>

                    {/* Results Summary */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        แสดง {filteredData.length} รายการจากทั้งหมด {data.length} รายการ
                    </Typography>

                    {filteredData.length === 0 ? (
                        <Alert severity="info">ไม่พบข้อมูล</Alert>
                    ) : (
                        <ThemeProvider theme={darkTheme}>
                            <MaterialReactTable
                                columns={columns}
                                data={filteredData}
                                enableColumnResizing
                                enableColumnOrdering
                                enableStickyHeader
                                enablePagination
                                enableGlobalFilter={false}
                                enableColumnFilters={false}
                                layoutMode="grid"
                                initialState={{
                                    density: 'compact',
                                    pagination: { pageSize: 25, pageIndex: 0 },
                                }}
                                muiTableContainerProps={{
                                    sx: { maxHeight: '600px' },
                                }}
                                muiTablePaperProps={{
                                    sx: {
                                        backgroundColor: '#16213e',
                                        backgroundImage: 'none',
                                    },
                                }}
                                muiTableHeadCellProps={{
                                    sx: {
                                        backgroundColor: '#0f3460',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        '& .Mui-TableHeadCell-Content': {
                                            whiteSpace: 'nowrap !important',
                                            overflow: 'visible !important',
                                            textOverflow: 'clip !important',
                                        },
                                        '& .Mui-TableHeadCell-Content-Labels': {
                                            whiteSpace: 'nowrap !important',
                                            overflow: 'visible !important',
                                            textOverflow: 'clip !important',
                                        },
                                        '& .Mui-TableHeadCell-Content-Wrapper': {
                                            whiteSpace: 'nowrap !important',
                                            overflow: 'visible !important',
                                            textOverflow: 'clip !important',
                                        },
                                        '& span': {
                                            whiteSpace: 'nowrap !important',
                                            overflow: 'visible !important',
                                            textOverflow: 'clip !important',
                                        },
                                    },
                                }}
                                muiTableBodyCellProps={{
                                    sx: {
                                        backgroundColor: '#1a1a2e',
                                        color: '#e0e0e0',
                                        borderBottom: '1px solid #2a2a4a',
                                    },
                                }}
                                muiTableBodyRowProps={({ row }) => ({
                                    sx: {
                                        '&:hover td': {
                                            backgroundColor: '#2a3a5a',
                                        },
                                        backgroundColor: row.index % 2 === 0 ? '#1a1a2e' : '#1e2545',
                                    },
                                })}
                                muiTopToolbarProps={{
                                    sx: {
                                        backgroundColor: '#16213e',
                                        color: '#fff',
                                    },
                                }}
                                muiBottomToolbarProps={{
                                    sx: {
                                        backgroundColor: '#16213e',
                                        color: '#fff',
                                    },
                                }}
                            />
                        </ThemeProvider>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};
