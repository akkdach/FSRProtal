import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { chartData } from '../data/mockData';

export const PerformanceChart: React.FC = () => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    ผลการทำงานรายเดือน
                </Typography>

                <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        แนวโน้มการทำงาน
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12 }}
                                stroke="#757575"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#757575" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="completed"
                                stroke="#4caf50"
                                strokeWidth={2}
                                name="เสร็จสิ้น"
                                dot={{ fill: '#4caf50', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="pending"
                                stroke="#ff9800"
                                strokeWidth={2}
                                name="รออนุมัติ"
                                dot={{ fill: '#ff9800', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="inProgress"
                                stroke="#1976d2"
                                strokeWidth={2}
                                name="กำลังดำเนินการ"
                                dot={{ fill: '#1976d2', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>

                <Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        เปรียบเทียบสถานะงาน
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12 }}
                                stroke="#757575"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#757575" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                }}
                            />
                            <Legend />
                            <Bar
                                dataKey="completed"
                                fill="#4caf50"
                                name="เสร็จสิ้น"
                                radius={[8, 8, 0, 0]}
                            />
                            <Bar
                                dataKey="pending"
                                fill="#ff9800"
                                name="รออนุมัติ"
                                radius={[8, 8, 0, 0]}
                            />
                            <Bar
                                dataKey="inProgress"
                                fill="#1976d2"
                                name="กำลังดำเนินการ"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
};
