export type SalaryRow = {
  id: number;
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
  meridiem: string;
  staffName: string;
  staffImageUrl: string | null;
  serviceName: string;
  roomLabel: string | null;
  hourlyRateSnapshot: number;
};
