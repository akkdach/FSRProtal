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
        () => [
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
                accessorKey: 'bpc_serialnumber',
                header: 'Serial Number',
            },
            {
                accessorKey: 'bpc_storecode',
                header: 'Store Code',
            },
            {
                accessorKey: 'bpc_slafinishdate',
                header: 'SLA Finish Date',
                Cell: ({ cell }) => moment(cell.getValue<string>()).format('DD/MM/YYYY HH:mm'),
            },
            {
                accessorKey: 'serviceorderstatus',
                header: 'Status',
            },
        ],
        [],
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

            <Paper sx={{ mb: 2, p: 1 }}>
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
                columns={columns}
                data={data}
                state={{
                    isLoading: isLoading,
                    showAlertBanner: isError,
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
