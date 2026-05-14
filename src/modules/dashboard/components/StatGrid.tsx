"use client";

import type { DashboardStats } from "../schema";

export function StatGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="section">
      <div className="stat-grid">
        <div className="stat">
          <span className="lbl">พนักงานพร้อมบริการ</span>
          <div className="val">{stats.availableStaff}<span className="unit">/ {stats.totalStaff} คน</span></div>
        </div>
        <div className="stat">
          <span className="lbl">ห้องที่ใช้อยู่</span>
          <div className="val">{stats.occupiedRooms}<span className="unit">/ {stats.totalRooms} ห้อง</span></div>
        </div>
        <div className="stat">
          <span className="lbl">ลูกค้าวันนี้</span>
          <div className="val">{stats.todayCustomers}<span className="unit">คน</span></div>
        </div>
        <div className="stat">
          <span className="lbl">รายได้วันนี้</span>
          <div className="val">{stats.todayRevenue}<span className="unit">บาท</span></div>
        </div>
      </div>
    </div>
  );
}
