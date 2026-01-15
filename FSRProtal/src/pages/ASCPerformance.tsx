import React, { useMemo, useState, useEffect } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import moment from 'moment';

// Define the shape of our data (based on smaserviceordertable)
// We use 'any' for now since schema is large, but ideally should be typed matches OneLake schema
interface ServiceOrder {
    [key: string]: any;
}

const VIEWS = [
    { id: 'Service_BN04_Install', label: 'Install (BN04)' },
    { id: 'Service_BN09_Remove', label: 'Remove (BN09)' },
    { id: 'Service_BN15_Refurbish', label: 'Refurbish (BN15)' },
    { id: 'Service_BN15_Refurbish_NB2CLOAN', label: 'Refurbish-LOAN(BN15)' },
    { id: 'Service_Summary_All', label: 'Summary' },
];

export const ASCPerformance: React.FC = () => {
    const [currentView, setCurrentView] = useState<string>(VIEWS[2].id); // Default to Refurbish
    const [data, setData] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);

    // Columns definition - Auto-generate or define specific key columns?
    // For now, let's define some common important columns and let MRT auto-discover if needed,
    // or just map top 10 fields.
    const columns = useMemo<MRT_ColumnDef<any>[]>(
        () => {
            if (currentView === 'Service_Summary_All') {
                return [
                    {
                        id: 'pickup_nr_col',
                        accessorFn: (row) => row.bpc_ticketno,
                        header: 'Pick-up Nr',
                        size: 150,
                    },

                    {
                        accessorKey: 'install_type',
                        header: 'BN04 Type',
                        size: 150,
                    },
                    {
                        // Use accessorFn + id to avoid conflict with standard view's column
                        id: 'bn09_type',
                        accessorFn: (row) => row.bpc_serviceordertypecode,
                        header: 'BN09 Type',
                        size: 150,
                    },
                    {
                        header: 'BN15 Type',
                        accessorKey: 'refurb_type',
                        size: 150,
                    },
                    {
                        header: 'BN15-Loan Type',
                        accessorKey: 'refurb_loan_type',
                        size: 150,
                    },
                    {
                        accessorKey: 'bpc_maintenanceactivitytypecode',
                        header: 'Maintenance Activity',
                        size: 150,
                    },
                    {
                        accessorKey: 'bpc_serviceobjectgroup',
                        header: 'Service Object Group',
                        size: 150,
                    },
                    {
                        accessorKey: 'serviceorderid',
                        header: 'Service Order ID',
                        size: 150,
                    },
                    {
                        accessorKey: 'bpc_customername',
                        header: 'Customer Name',
                    },
                    {
                        accessorKey: 'bpc_notifdate',
                        header: 'Pick-up Date',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                        },
                    },
                    {
                        id: 'pickup_on_col',
                        accessorFn: (row) => row.bpc_scheduledstart,
                        header: 'Pick-up On',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                        },
                    },

                    {
                        accessorKey: 'bpc_customerbranch',
                        header: 'third',
                    },
                    {
                        id: 'serial_nr_col',
                        accessorFn: (row) => row.bpc_serialnumber,
                        header: 'Serial Nr',
                    },
                    {
                        accessorKey: 'bpc_actualstartdate',
                        header: 'Return Date',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                        },
                    },
                    {
                        id: 'return_date_checking_col',
                        accessorFn: (row) => row.install_scheduledstart,
                        header: 'Return Date Checking',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                        },
                    },
                    {
                        id: 'pickup_month_col',
                        accessorFn: (row) => row.bpc_scheduledstart,
                        header: 'Pick up month',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return (val && !val.startsWith('1900')) ? moment.utc(val).format('MM') : '';
                        },
                        size: 100,
                    },
                    {
                        id: 'pickup_year_col',
                        accessorFn: (row) => row.bpc_scheduledstart,
                        header: 'Pick up year',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return (val && !val.startsWith('1900')) ? moment.utc(val).format('YYYY') : '';
                        },
                        size: 100,
                    },
                    {
                        id: 'return_month_col',
                        accessorFn: (row) => row.install_scheduledstart,
                        header: 'Return month',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return (val && !val.startsWith('1900')) ? moment.utc(val).format('MM') : '';
                        },
                        size: 100,
                    },
                    {
                        id: 'return_year_col',
                        accessorFn: (row) => row.install_scheduledstart,
                        header: 'Return year',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return (val && !val.startsWith('1900')) ? moment.utc(val).format('YYYY') : '';
                        },
                        size: 100,
                    },
                    {
                        id: 'return_status_col',
                        accessorFn: (row) => row.bpc_actualstartdate,
                        header: 'Return date checking',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? 'Done' : 'Waiting Return Date';
                        },
                        size: 150,
                    },
                    {
                        id: 'final_repair_status_col',
                        accessorFn: (row) => row.bpc_mobilestatus,
                        header: 'Final repair status',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return (val === 'COMP') ? 'Completed' : 'waiting Repair';
                        },
                        size: 150,
                    },



                    {
                        accessorKey: 'bpc_model',
                        header: 'Machine Model',
                    },
                    {
                        accessorKey: 'bpc_modelnodescription',
                        header: 'Machine Type',
                    },
                    {
                        accessorKey: 'bpc_slafinishdate',
                        header: 'SLA Finish Date',
                        Cell: ({ cell }) => {
                            const val = cell.getValue<string>();
                            return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                        },
                    },
                ];
            }

            // Standard Columns for other views
            return [
                {
                    id: 'pickup_nr_col',
                    accessorFn: (row) => row.bpc_ticketno,
                    header: 'Pick-up Nr',
                    size: 150,
                },

                // Filter columns (for debugging - currently undefined in Parquet data)
                {
                    accessorKey: 'bpc_serviceordertypecode',
                    header: 'Service Order Type',
                    size: 150,
                },
                {
                    accessorKey: 'bpc_maintenanceactivitytypecode',
                    header: 'Maintenance Activity',
                    size: 150,
                },
                {
                    accessorKey: 'bpc_serviceobjectgroup',
                    header: 'Service Object Group',
                    size: 150,
                },
                // Existing columns
                {
                    accessorKey: 'serviceorderid', //access nested data with dot notation
                    header: 'Service Order ID',
                    size: 150,
                },
                {
                    accessorKey: 'bpc_customername',
                    header: 'Customer Name',
                },
                {
                    accessorKey: 'bpc_notifdate',
                    header: 'Pick-up Date',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                    },
                },
                {
                    id: 'pickup_on_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Pick-up On',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                    },
                },

                {
                    accessorKey: 'bpc_customerbranch',
                    header: 'third',
                },
                {
                    id: 'serial_nr_col',
                    accessorFn: (row) => row.bpc_serialnumber,
                    header: 'Serial Nr',
                },
                {
                    accessorKey: 'bpc_actualstartdate',
                    header: 'Return Date',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                    },
                },
                {
                    id: 'return_date_checking_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Return Date Checking',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                    },
                },
                {
                    id: 'pickup_month_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Pick up month',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('MM') : '';
                    },
                    size: 100,
                },
                {
                    id: 'pickup_year_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Pick up year',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('YYYY') : '';
                    },
                    size: 100,
                },
                {
                    id: 'return_month_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Return month',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('MM') : '';
                    },
                    size: 100,
                },
                {
                    id: 'return_year_col',
                    accessorFn: (row) => row.bpc_scheduledstart,
                    header: 'Return year',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('YYYY') : '';
                    },
                    size: 100,
                },
                {
                    id: 'return_status_col',
                    accessorFn: (row) => row.bpc_actualstartdate,
                    header: 'Return date checking',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? 'Done' : 'Waiting Return Date';
                    },
                    size: 150,
                },
                {
                    id: 'final_repair_status_col',
                    accessorFn: (row) => row.bpc_mobilestatus,
                    header: 'Final repair status',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return (val === 'COMP') ? 'Completed' : 'waiting Repair';
                    },
                    size: 150,
                },

                {
                    accessorKey: 'bpc_model',
                    header: 'Machine Model',
                },
                {
                    accessorKey: 'bpc_modelnodescription',
                    header: 'Machine Type',
                },
                {
                    accessorKey: 'bpc_slafinishdate',
                    header: 'SLA Finish Date',
                    Cell: ({ cell }) => {
                        const val = cell.getValue<string>();
                        return val ? moment.utc(val).format('DD/MM/YYYY HH:mm') : '';
                    },
                },
            ];
        },
        [currentView], // Re-calculate columns when view changes
    );

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setIsError(false);
            try {
                const response = await fetch(`http://localhost:3005/api/fsr-protal/orders?view=${currentView}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `HTTP Error ${response.status}`);
                }

                if (result.data) {
                    setData(result.data);
                } else {
                    setData([]);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [currentView]);

    const handleViewChange = (
        event: React.MouseEvent<HTMLElement>,
        newView: string,
    ) => {
        if (newView !== null) {
            setCurrentView(newView);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>
                Performance Dashboard
            </Typography>

            <Paper sx={{ mb: 2, p: 1, width: 'fit-content', backgroundColor: 'transparent', elevation: 0 }} elevation={0}>
                <ToggleButtonGroup
                    color="primary"
                    value={currentView}
                    exclusive
                    onChange={handleViewChange}
                    aria-label="Platform"
                >
                    {VIEWS.map((view) => (
                        <ToggleButton key={view.id} value={view.id}>
                            {view.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Paper>

            <MaterialReactTable
                key={currentView + '_v7'} // Force re-render/reset state when view changes
                columns={columns}
                data={data}
                enableColumnOrdering={false}
                enableColumnDragging={false}
                enablePinning={false}
                initialState={{
                    columnOrder: columns.map((col: any) => col.id || col.accessorKey),
                }}
                state={{
                    isLoading: isLoading,
                    showAlertBanner: isError,
                }}
                muiTablePaperProps={{
                    sx: {
                        backgroundColor: 'transparent',
                        backgroundImage: 'none',
                    }
                }}
                muiToolbarAlertBannerProps={
                    isError
                        ? {
                            color: 'error',
                            children: 'Error loading data from OneLake Middleware',
                        }
                        : undefined
                }
            />
        </Box>
    );
};
