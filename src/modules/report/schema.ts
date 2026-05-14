export type SalaryRow = {
  id: number;
  staffCode: string | null;
  firstName: string;
  lastName: string;
  hours: number;
  salary: number;
};

export type ServicePopularity = {
  name: string;
  percent: number;
};

export type ReportData = {
  dailyCounts: number[];
  dailyRevenue: number[];
  servicePopularity: ServicePopularity[];
  salaryRows: SalaryRow[];
};

export type PayrollPeriod = {
  key: string;
  label: string;
  rows: SalaryRow[];
};

export type StaffWorkEntry = {
  date: string;
  time: string;
  endTime: string;
  meridiem: string;
  staffCode: string | null;
  staffName: string;
  staffImageUrl: string | null;
  serviceName: string;
  durationMin: number;
  roomLabel: string | null;
  hourlyRateSnapshot: number;
  computedSalary: number;
};
