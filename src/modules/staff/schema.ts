export type Employee = {
  id: number;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  imageUrl: string | null;
  employed: boolean;
  present: boolean;
  skills: string[];
};

export type Skill = {
  id: number;
  name: string;
};
