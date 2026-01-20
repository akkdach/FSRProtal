import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Chip
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import moment from 'moment';

interface ReportData {
    bpc_ticketno: string;
    bpc_notifdate: string;
    bpc_customername: string;
    bpc_modelnodescription: string;
    bpc_mobilestatus: string;
    [key: string]: any;
}

export const ReportsTable: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<ReportData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Using Summary View as it has the logic for Status
                const response = await fetch('http://localhost:3005/api/fsr-protal/orders?view=Service_Summary_All');
                const result = await response.json();
                if (result.data) {
                    setData(result.data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMP':
            case 'Completed':
                return 'success';
            case 'WAPP':
            case 'waiting Repair':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        if (status === 'COMP') return 'Completed';
        return 'waiting Repair';
    };

    const columns = useMemo<MRT_ColumnDef<ReportData>[]>(
        () => [
            {
                accessorKey: 'bpc_ticketno',
                header: 'Pick-up Nr',
                size: 150,
            },
            {
                accessorKey: 'bpc_notifdate',
                header: 'Pick-up Date',
                Cell: ({ cell }) => {
                    const val = cell.getValue<string>();
                    return val ? moment.utc(val).format('DD/MM/YYYY') : '';
                },
                size: 150,
            },
            {
                accessorKey: 'custaccount',
                header: 'Customer Number',
            },
            {
                accessorKey: 'bpc_modelnodescription',
                header: 'Machine Type',
            },
            {
                accessorKey: 'bpc_mobilestatus',
                header: 'Final repair status',
                Cell: ({ cell }) => {
                    const status = cell.getValue<string>();
                    const label = getStatusLabel(status);
                    return (
                        <Chip
                            label={label}
                            color={getStatusColor(status) as any}
                            size="small"
                        />
                    );
                },
                size: 150,
            },
        ],
        [],
    );

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    รายงานล่าสุด (Latest Reports)
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <MaterialReactTable
                        columns={columns}
                        data={data}
                        enableColumnOrdering={true}
                        enableColumnDragging={false}
                        enablePinning={false}
                        enableGlobalFilter={true} // Enable global search
                        muiTablePaperProps={{
                            sx: {
                                backgroundColor: 'transparent',
                                backgroundImage: 'none',
                                elevation: 0
                            }
                        }}
                        muiTableBodyRowProps={({ row }) => ({
                            onClick: () => {
                                navigate(`/report/${row.original.bpc_ticketno}`, {
                                    state: { reportData: row.original }
                                });
                            },
                            sx: {
                                cursor: 'pointer',
                            },
                        })}
                    />
                )}
            </CardContent>
        </Card>
    );
};
