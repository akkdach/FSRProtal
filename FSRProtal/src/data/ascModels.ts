// ASC Programs Data Models

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    model: string;
    category: 'OI' | 'VL' | 'Milk Device' | 'B2B';
    zone: 'BKK' | 'UPC';
    province: string;
    warrantyType: 'Standard' | 'Extended' | 'Out of Warranty';
    status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
    createdDate: string;
    totalAmount: number;
    customerName: string;
}

export interface PartsUsage {
    id: string;
    sku: string;
    partName: string;
    model: string;
    puId: string;
    quantity: number;
    usageDate: string;
    month: string;
    failureCode?: string;
    repairCode?: string;
    unitPrice: number;
    totalCost: number;
}

export interface ServiceJob {
    id: string;
    jobNumber: string;
    puId: string;
    model: string;
    category: 'OI' | 'VL' | 'Milk Device' | 'B2B';
    status: 'Waiting Return' | 'Waiting Close' | 'Waiting Pickup' | 'In Repair' | 'Completed';
    repairCode: '1' | '2' | '3';
    warrantyType: 'In Warranty' | 'Out of Warranty' | 'Repair Warranty';
    creationTime: string;
    pickupTime?: string;
    repairTime?: string;
    returnTime?: string;
    turnaroundTime?: number; // in hours
    laborCost: number;
    partsCost: number;
    totalCost: number;
    isNTF: boolean;
    videoUrl?: string;
    ascRecommendation?: string;
}

export interface StockLoan {
    id: string;
    loanType: 'B2B' | 'B2C';
    serialNumber: string;
    model: string;
    puId?: string;
    intervention?: string;
    location: 'ASC' | 'Customer';
    loanDate: string;
    returnDate?: string;
    status: 'Active' | 'Returned';
}

export interface SparePartInventory {
    id: string;
    sku: string;
    partName: string;
    model: string;
    currentStock: number;
    monthlyAverageUsage: number;
    stockCoverageMonths: number;
    minStock: number; // 4 months
    maxStock: number; // 6 months
    unitPrice: number;
    totalValue: number;
    lastPurchaseDate: string;
    nextPurchaseRecommendation?: string;
    inThisMonth: number;
    outThisMonth: number;
}

export interface ComplaintRecord {
    id: string;
    complaintNumber: string;
    puId: string;
    model: string;
    category: 'OI' | 'VL' | 'Milk Device' | 'B2B';
    complaintType: string;
    rootCause: string;
    description: string;
    reportedDate: string;
    resolvedDate?: string;
    status: 'Open' | 'Investigating' | 'Resolved' | 'Closed';
}

export interface TimeTracking {
    jobId: string;
    creationTime: string;
    pickupTime?: string;
    repairStartTime?: string;
    repairEndTime?: string;
    returnTime?: string;
    totalTurnaroundHours?: number;
    pickupToReturnHours?: number;
}

export interface DashboardMetrics {
    totalPOs: number;
    openJobs: number;
    lowStockAlerts: number;
    excessStockAlerts: number;
    avgTurnaroundTime: number;
    totalCostThisMonth: number;
    ntfCount: number;
    activeComplaints: number;
}

export interface MonthlyTrend {
    month: string;
    totalJobs: number;
    completedJobs: number;
    avgCost: number;
    partsUsage: number;
    ntfCount: number;
}
