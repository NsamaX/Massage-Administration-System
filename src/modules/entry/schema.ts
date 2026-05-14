export type EntryStaffOption = { id: number; label: string };
export type EntryMassageOption = { id: number; label: string; duration: number; durations: number[] };
export type EntryRoomOption = { id: number; label: string };

export type EntryOptions = {
  staff: EntryStaffOption[];
  massages: EntryMassageOption[];
  rooms: EntryRoomOption[];
};

export type RecentEntry = {
  id: number;
  date: string;
  time: string;
  endTime: string;
  meridiem: string;
  staffCode: string | null;
  staffName: string;
  staffImageUrl: string | null;
  massageName: string;
  durationMin: number;
  roomLabel: string | null;
  hourlyRateSnapshot: number;
  computedSalary: number;
};
