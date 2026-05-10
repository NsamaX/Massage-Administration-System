export type StaffStatus = {
  id: number;
  name: string;
  phone: string | null;
  imageUrl: string | null;
  skills: string[];
  status: "available" | "working" | "absent";
};

export type MassageOption = {
  id: number;
  label: string;
};

export type RoomOption = {
  id: number;
  label: string;
};
