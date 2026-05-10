export type EntryStaffOption = { id: number; label: string };
export type EntryMassageOption = { id: number; label: string; duration: number };
export type EntryRoomOption = { id: number; label: string };

export type EntryOptions = {
  staff: EntryStaffOption[];
  massages: EntryMassageOption[];
  rooms: EntryRoomOption[];
};

export type RecentEntry = {
  id: number;
  staffName: string;
  massageName: string;
  durationMin: number;
  startTime: string;
  roomLabel: string | null;
};
