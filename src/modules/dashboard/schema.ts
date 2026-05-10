export type DashboardStats = {
  totalStaff: number;
  availableStaff: number;
  totalRooms: number;
  occupiedRooms: number;
  todayCustomers: number;
  todayRevenue: number;
};

export type RoomState = {
  id: number;
  number: number;
  staffName: string | null;
  staffImageUrl: string | null;
  serviceName: string | null;
  startTime: string | null;
};

export type HistoryEntry = {
  date: string;
  time: string;
  meridiem: string;
  staffName: string;
  staffImageUrl: string | null;
  serviceName: string;
  roomLabel: string | null;
  statusLabel: string;
};
