"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRoom, deleteRoom } from "../server";
import type { RoomState } from "../schema";

type Props = {
  room: RoomState | null;
  onClose: () => void;
};

export function RoomPanel({ room, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  function handleAdd() {
    setAddError(null);
    startTransition(async () => {
      const res = await addRoom();
      if (res.error) setAddError(res.error);
    });
  }

  function handleDelete() {
    if (!room) return;
    startTransition(async () => {
      const res = await deleteRoom(room.id);
      if (!res.error) onClose();
    });
  }

  if (!room) {
    return (
      <div className="room-panel room-panel-empty">
        <button
          type="button"
          className="room-panel-hint"
          onClick={handleAdd}
          disabled={pending}
        >
          {pending ? "กำลังเพิ่ม…" : "+ เพิ่มห้อง"}
        </button>
        {addError && <span className="row-error">{addError}</span>}
      </div>
    );
  }

  const occupied = room.staffNames.length > 0;

  return (
    <div className="room-panel">
      <div className="room-panel-head">
        <span className="room-panel-num">ห้อง {room.number}</span>
        <button type="button" className="room-panel-close" onClick={onClose} aria-label="ปิด">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={`room-panel-state${occupied ? " busy" : ""}`}>
        <span className="d" />
        {occupied ? "กำลังใช้" : "ว่าง"}
      </div>

      {occupied && (
        <div className="room-panel-info">
          <div className="room-panel-who">
            {room.staffNames.length === 1
              ? room.staffNames[0]
              : `${room.staffNames[0]} และอีก ${room.staffNames.length - 1} คน`}
          </div>
          {(room.serviceName || room.startTime) && (
            <div className="room-panel-svc">
              {room.serviceName}
              {room.startTime && ` · เริ่ม ${room.startTime}`}
            </div>
          )}
        </div>
      )}

      <div className="room-panel-actions">
        {occupied ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/appointments")}
          >
            ดูนัดหมาย
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            onClick={handleDelete}
            disabled={pending}
          >
            ลบห้อง
          </button>
        )}
      </div>
    </div>
  );
}
