export type StaffStatus = {
  id: number;
  name: string;
  employeeCode: string | null;
  imageUrl: string | null;
  skills: string[];
  status: "available" | "working" | "absent";
  workingRoomNumber: number | null;
};

export type MassageOption = {
  id: number;
  label: string;
  duration: number;
  durations: number[];
};

export type RoomOption = {
  id: number;
  label: string;
};
