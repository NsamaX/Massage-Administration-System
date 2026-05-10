export type UserRow = {
  id: number;
  name: string;
  role: "dev" | "admin" | "staff";
  employeeId: number | null;
  lastLoginAt: Date | null;
};

export type EmployeeOption = {
  id: number;
  name: string;
};
