"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoom, updateRoomNumber } from "../server";
import type { RoomState } from "../schema";

function RoomCard({
  room, isSelected, onSelect, onDelete, onNavigate, onRename,
}: {
  room: RoomState;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onNavigate: () => void;
  onRename: (newNumber: number) => Promise<{ error: string | null }>;
}) {
  const occupied = room.staffNames.length > 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamePending, setRenamePending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(String(room.number));
    setRenameError(null);
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  }

  async function commitEdit() {
    if (skipBlurRef.current) { skipBlurRef.current = false; return; }
    const num = parseInt(draft, 10);
    if (!draft || isNaN(num) || num < 1) { setRenameError("ต้องมากกว่า 0"); return; }
    if (num === room.number) { setEditing(false); return; }
    setRenamePending(true);
    const res = await onRename(num);
    setRenamePending(false);
    if (res.error) { setRenameError(res.error); return; }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { skipBlurRef.current = true; setEditing(false); setRenameError(null); }
  }

  function handleCardClick() {
    if (editing) return;
    if (occupied) onNavigate();
    else onSelect();
  }

  return (
    <div
      className={`room${occupied ? " busy" : ""}${isSelected && !occupied ? " selected" : ""}`}
      onClick={handleCardClick}
      style={{ cursor: "pointer", position: "relative" }}
    >
      {isSelected && !occupied && (
        <div className="room-delete-overlay">
          <button
            type="button"
            className="room-delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="ลบห้อง"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 7.5h6.6l.7-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="top">
        {editing ? (
          <span className="r-num" onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            ห้อง
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              disabled={renamePending}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              style={{
                width: "36px", padding: "0 2px", fontSize: "inherit", fontWeight: "inherit",
                fontFamily: "inherit", background: "transparent", border: "none",
                borderBottom: "1px solid currentColor", outline: "none", textAlign: "center",
              }}
            />
          </span>
        ) : (
          <span
            className="r-num"
            onClick={startEdit}
            title="คลิกเพื่อแก้เลขห้อง"
            style={{ cursor: "text" }}
          >
            ห้อง {room.number}
          </span>
        )}
        <span className="r-state">
          <span className="d" />
          {occupied ? "กำลังใช้" : "ว่าง"}
        </span>
      </div>

      {occupied ? (
        <>
          <div className="who">
            {room.staffNames.length === 1
              ? room.staffNames[0]
              : `${room.staffNames[0]} และอีก ${room.staffNames.length - 1} คน`}
          </div>
          <div className="svc">
            {room.serviceName}
            {room.startTime && ` · เริ่ม ${room.startTime}`}
          </div>
        </>
      ) : (
        <div className="empty">—</div>
      )}

      {renameError && (
        <div style={{ fontSize: "10px", color: "var(--danger)", marginTop: "4px" }}>{renameError}</div>
      )}
    </div>
  );
}

type Props = {
  rooms: RoomState[];
};

export function RoomGrid({ rooms }: Props) {
  const router = useRouter();
  const [selectedEmptyId, setSelectedEmptyId] = useState<number | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(roomId: number) {
    setRoomError(null);
    startTransition(async () => {
      const res = await deleteRoom(roomId);
      if (res.error) setRoomError(res.error);
      else setSelectedEmptyId(null);
    });
  }

  return (
    <div className="room-col">
      <div className="rooms-wrap">
        <div className="rooms">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isSelected={room.id === selectedEmptyId}
              onSelect={() => setSelectedEmptyId(prev => prev === room.id ? null : room.id)}
              onDelete={() => handleDelete(room.id)}
              onNavigate={() => router.push("/appointments")}
              onRename={(newNumber) => updateRoomNumber(room.id, newNumber)}
            />
          ))}
        </div>
      </div>

      {roomError && (
        <p style={{ padding: "6px 14px", fontSize: "12px", color: "var(--danger)", background: "var(--card)", borderTop: "1px solid var(--line)" }}>{roomError}</p>
      )}
    </div>
  );
}
