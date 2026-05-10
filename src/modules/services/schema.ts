export type Massage = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  hourlyRate: number;
  image_url: string | null;
  status: "active" | "paused" | "inactive";
};

export const STATUS_LABEL: Record<Massage["status"], string> = {
  active: "เปิดให้บริการ",
  paused: "ปิดชั่วคราว",
  inactive: "ยังไม่เปิดให้บริการ",
};

export const STATUS_OPTIONS = [
  { value: "active" as const, label: "เปิดให้บริการ" },
  { value: "paused" as const, label: "ปิดชั่วคราว" },
  { value: "inactive" as const, label: "ยังไม่เปิดให้บริการ" },
];
