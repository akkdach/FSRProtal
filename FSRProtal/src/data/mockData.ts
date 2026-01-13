// Mock data for FSR Portal Dashboard

export interface MetricData {
    completedJobs: number;
    pendingApprovals: number;
    activeTechnicians: number;
}

export interface ReportData {
    id: string;
    technician: string;
    customer: string;
    status: 'เสร็จสิ้น' | 'รออนุมัติ' | 'กำลังดำเนินการ' | 'ยกเลิก';
    date: string;
    location: string;
    jobType: string;
}

export interface ChartDataPoint {
    month: string;
    completed: number;
    pending: number;
    inProgress: number;
}

export const metricsData: MetricData = {
    completedJobs: 248,
    pendingApprovals: 12,
    activeTechnicians: 34,
};

export const reportsData: ReportData[] = [
    {
        id: 'RPT-2024-001',
        technician: 'สมชาย ใจดี',
        customer: 'บริษัท เอบีซี จำกัด',
        status: 'เสร็จสิ้น',
        date: '2024-12-20',
        location: 'กรุงเทพฯ',
        jobType: 'ติดตั้งอุปกรณ์',
    },
    {
        id: 'RPT-2024-002',
        technician: 'วิชัย สุขสันต์',
        customer: 'ห้างหุ้นส่วน XYZ',
        status: 'รออนุมัติ',
        date: '2024-12-21',
        location: 'นนทบุรี',
        jobType: 'ซ่อมบำรุง',
    },
    {
        id: 'RPT-2024-003',
        technician: 'สมหญิง รักงาน',
        customer: 'โรงงาน DEF',
        status: 'กำลังดำเนินการ',
        date: '2024-12-22',
        location: 'ปทุมธานี',
        jobType: 'ตรวจสอบระบบ',
    },
    {
        id: 'RPT-2024-004',
        technician: 'ประยุทธ มั่นคง',
        customer: 'สำนักงาน GHI',
        status: 'เสร็จสิ้น',
        date: '2024-12-19',
        location: 'สมุทรปราการ',
        jobType: 'อัพเกรดซอฟต์แวร์',
    },
    {
        id: 'RPT-2024-005',
        technician: 'อนุชา ขยัน',
        customer: 'ร้าน JKL',
        status: 'รออนุมัติ',
        date: '2024-12-23',
        location: 'กรุงเทพฯ',
        jobType: 'ติดตั้งอุปกรณ์',
    },
    {
        id: 'RPT-2024-006',
        technician: 'สมชาย ใจดี',
        customer: 'บริษัท MNO จำกัด',
        status: 'เสร็จสิ้น',
        date: '2024-12-18',
        location: 'ชลบุรี',
        jobType: 'ซ่อมบำรุง',
    },
    {
        id: 'RPT-2024-007',
        technician: 'วิชัย สุขสันต์',
        customer: 'โรงพยาบาล PQR',
        status: 'กำลังดำเนินการ',
        date: '2024-12-22',
        location: 'ระยอง',
        jobType: 'ตรวจสอบระบบ',
    },
    {
        id: 'RPT-2024-008',
        technician: 'สมหญิง รักงาน',
        customer: 'โรงเรียน STU',
        status: 'เสร็จสิ้น',
        date: '2024-12-17',
        location: 'กรุงเทพฯ',
        jobType: 'ติดตั้งอุปกรณ์',
    },
    {
        id: 'RPT-2024-009',
        technician: 'ประยุทธ มั่นคง',
        customer: 'มหาวิทยาลัย VWX',
        status: 'รออนุมัติ',
        date: '2024-12-23',
        location: 'นครปฐม',
        jobType: 'อัพเกรดซอฟต์แวร์',
    },
    {
        id: 'RPT-2024-010',
        technician: 'อนุชา ขยัน',
        customer: 'ห้างสรรพสินค้า YZ',
        status: 'เสร็จสิ้น',
        date: '2024-12-16',
        location: 'กรุงเทพฯ',
        jobType: 'ซ่อมบำรุง',
    },
];

export const chartData: ChartDataPoint[] = [
    { month: 'ม.ค.', completed: 45, pending: 8, inProgress: 12 },
    { month: 'ก.พ.', completed: 52, pending: 6, inProgress: 10 },
    { month: 'มี.ค.', completed: 48, pending: 10, inProgress: 15 },
    { month: 'เม.ย.', completed: 61, pending: 7, inProgress: 11 },
    { month: 'พ.ค.', completed: 55, pending: 9, inProgress: 13 },
    { month: 'มิ.ย.', completed: 58, pending: 5, inProgress: 9 },
    { month: 'ก.ค.', completed: 63, pending: 8, inProgress: 14 },
    { month: 'ส.ค.', completed: 59, pending: 11, inProgress: 16 },
    { month: 'ก.ย.', completed: 67, pending: 6, inProgress: 10 },
    { month: 'ต.ค.', completed: 71, pending: 9, inProgress: 12 },
    { month: 'พ.ย.', completed: 64, pending: 7, inProgress: 11 },
    { month: 'ธ.ค.', completed: 72, pending: 12, inProgress: 15 },
];
