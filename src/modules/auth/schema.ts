export type AuthUser = {
  id: number;
  name: string;
  role: "dev" | "admin" | "staff";
};

export type SignInState = {
  error: string | null;
};

export const ROLE_LABEL: Record<AuthUser["role"], string> = {
  dev: "นักพัฒนา",
  admin: "ผู้จัดการ",
  staff: "พนักงาน",
};
