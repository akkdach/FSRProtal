import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    ThemeProvider,
    createTheme,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useTranslation } from 'react-i18next';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`view-tabpanel-${index}`}
            aria-labelledby={`view-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

interface ViewData {
    name: string;
    displayName: string;
    endpoint: string;
}

const AVAILABLE_VIEWS: ViewData[] = [
    { name: 'service_BN4_NB2CLOAN_New', displayName: 'BN4 - NB2C Loan New', endpoint: '/api/fsr-protal/orders?view=service_BN4_NB2CLOAN_New' },
    { name: 'Service_BN4_New', displayName: 'BN4 - New', endpoint: '/api/fsr-protal/orders?view=Service_BN4_New' },
    { name: 'service_BN09_NB2CLOAN_New', displayName: 'BN09 - NB2C Loan New', endpoint: '/api/fsr-protal/orders?view=service_BN09_NB2CLOAN_New' },
    { name: 'Service_BN09_New', displayName: 'BN09 - New', endpoint: '/api/fsr-protal/orders?view=Service_BN09_New' },
];

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

export const DataView: React.FC = () => {
    const { t } = useTranslation();
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
        setData([]);
        setError(null);
    };

    useEffect(() => {
        fetchData(AVAILABLE_VIEWS[currentTab]);
    }, [currentTab]);

    const fetchData = async (view: ViewData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(view.endpoint);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            const result = await response.json();
            // API returns { data: [...], total, page, limit }
            setData(result.data || result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Column header mapping for display names
    const columnHeaderMap: Record<string, string> = {
        bpc_serialnumber: 'Serial Nr',
        bpc_ticketno: 'Pick-up Nr',
        bpc_zonegroup: 'Area',
        bpc_resolutionid: 'Rep Code 1',
        bpc_conditionid: 'Failure Code',
        bpc_notifdate: 'Pick-up Date',
        bpc_scheduledstart: 'Pick-up On',
        bpc_customerbranch: 'Third',
        bpc_actualstartdate: 'Return Date',
        bpc_model: 'Machine Model',
        bpc_modelnodescription: 'Machine Type',
        bpc_customername: 'Customer Name',
        bpc_serviceordertypecode: 'Order Type',
        bpc_maintenanceactivitytypecode: 'Activity Type',
        bpc_serviceobjectgroup: 'Object Group',
        bpc_slafinishdate: 'SLA Finish Date',
        bpc_mobilestatus: 'Mobile Status',
        serviceorderid: 'Service Order ID',
        custaccount: 'Customer Account',
        createdon: 'Created On',
    };

    // Dynamic columns based on data
    const columns = useMemo<MRT_ColumnDef<any>[]>(() => {
        if (data.length === 0) return [];

        return Object.keys(data[0]).map((key) => ({
            accessorKey: key,
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
        }));
    }, [data]);

    const renderDataTable = (viewData: any[]) => {
        if (viewData.length === 0) {
            return (
                <Alert severity="info">
                    {t('common.noData')}
                </Alert>
            );
        }

        return (
            <ThemeProvider theme={darkTheme}>
                <MaterialReactTable
                    columns={columns}
                    data={viewData}
                    enableColumnResizing
                    enableColumnOrdering
                    enableStickyHeader
                    enablePagination
                    enableGlobalFilter
                    enableColumnFilters
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
        );
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TableChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {t('asc.data.title')}
                </Typography>
            </Box>

            <Card>
                <CardContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={currentTab}
                            onChange={handleTabChange}
                            aria-label="data view tabs"
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {AVAILABLE_VIEWS.map((view, index) => (
                                <Tab
                                    key={view.name}
                                    label={view.displayName}
                                    id={`view-tab-${index}`}
                                    aria-controls={`view-tabpanel-${index}`}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {AVAILABLE_VIEWS.map((view, index) => (
                        <TabPanel key={view.name} value={currentTab} index={index}>
                            {loading && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            )}

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {!loading && !error && renderDataTable(data)}
                        </TabPanel>
                    ))}
                </CardContent>
            </Card>
        </Box>
    );
};
