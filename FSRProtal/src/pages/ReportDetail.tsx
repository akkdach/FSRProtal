import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Divider,
    Paper,
    Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import moment from 'moment';

export const ReportDetail: React.FC = () => {
    const { ticketNo } = useParams<{ ticketNo: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const reportData = location.state?.reportData;

    if (!reportData) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error">
                    No data found for Ticket No: {ticketNo}
                </Typography>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/')}
                    sx={{ mt: 2 }}
                >
                    Back to Dashboard
                </Button>
            </Box>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        if (dateString.startsWith('1900')) return '-';
        return moment.utc(dateString).format('DD/MM/YYYY HH:mm');
    };

    const formatMonthYear = (dateString: string) => {
        if (!dateString || dateString.startsWith('1900')) return '-';
        return moment.utc(dateString).format('MM/YYYY');
    };

    const calculateServiceTime = (row: any) => {
        if (row.install_scheduledstart && row.refurb_scheduledstart) {
            const start = moment.utc(row.refurb_scheduledstart);
            const end = moment.utc(row.install_scheduledstart);

            if (start.year() === 1900 || end.year() === 1900) {
                return 'วันที่เป็นค่าว่าง';
            }

            if (start.isValid() && end.isValid()) {
                const diff = end.diff(start, 'days');
                return `${diff} Days`;
            }
        }
        return 'วันที่เป็นค่าว่าง';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'COMP') return 'Completed';
        return 'waiting Repair';
    };

    const DetailItem = ({ label, value }: { label: string, value: any }) => (
        <Box sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ width: { xs: '100%', sm: '40%' }, mb: { xs: 0.5, sm: 0 } }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        {label}
                    </Typography>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: '60%' } }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {value || '-'}
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ mt: 1 }} />
        </Box>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <Typography variant="h6" color="primary" sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
            {title}
        </Typography>
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{ mb: 3 }}
            >
                Back to Dashboard
            </Button>

            <Card elevation={3} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Report Details: {reportData.bpc_ticketno}
                        </Typography>
                        <Chip
                            label={getStatusLabel(reportData.bpc_mobilestatus)}
                            color={reportData.bpc_mobilestatus === 'COMP' ? 'success' : 'warning'}
                        />
                    </Box>

                    <Paper sx={{ p: 3, bgcolor: 'background.default' }} elevation={0}>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <SectionHeader title="Identification" />
                                <DetailItem label="Pick-up Nr" value={reportData.bpc_ticketno} />
                                <DetailItem label="Service Order ID" value={reportData.serviceorderid} />
                                <DetailItem label="Serial Number" value={reportData.bpc_serialnumber} />
                                <DetailItem label="Customer Branch (third)" value={reportData.bpc_customerbranch} />

                                <SectionHeader title="Customer & Machine" />
                                <DetailItem label="Customer Number" value={reportData.custaccount} />
                                <DetailItem label="Customer Name" value={reportData.bpc_customername} />
                                <DetailItem label="Machine Model" value={reportData.bpc_model} />
                                <DetailItem label="Machine Type" value={reportData.bpc_modelnodescription} />
                                <DetailItem label="Service Object Group" value={reportData.bpc_serviceobjectgroup} />
                                <DetailItem label="Maintenance Activity" value={reportData.bpc_maintenanceactivitytypecode} />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <SectionHeader title="Date" />
                                <DetailItem label="Pick-up Date" value={formatDate(reportData.bpc_notifdate)} />
                                <DetailItem label="Pick-up On" value={formatDate(reportData.bpc_scheduledstart)} />
                                <DetailItem label="Pick up Month/Year" value={formatMonthYear(reportData.bpc_scheduledstart)} />
                                <DetailItem label="Return Date" value={formatDate(reportData.bpc_actualstartdate)} />
                                <DetailItem label="Return Date Checking" value={formatDate(reportData.install_scheduledstart)} />
                                <DetailItem label="Return Month/Year" value={formatMonthYear(reportData.install_scheduledstart)} />
                                <DetailItem label="Loan Return Date" value={formatDate(reportData.rem_loan_scheduledstart)} />
                                <DetailItem label="SLA Finish Date" value={formatDate(reportData.bpc_slafinishdate)} />

                                <SectionHeader title="Calculations" />
                                <DetailItem label="Return Date Check Status" value={reportData.bpc_actualstartdate ? 'Done' : 'Waiting Return Date'} />
                                <DetailItem label="Service Time (Day)" value={calculateServiceTime(reportData)} />
                                <DetailItem label="Final Repair Status" value={getStatusLabel(reportData.bpc_mobilestatus)} />
                            </Grid>
                        </Grid>
                    </Paper>
                </CardContent>
            </Card>
        </Box>
    );
};
