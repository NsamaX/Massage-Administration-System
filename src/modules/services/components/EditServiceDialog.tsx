"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { STATUS_OPTIONS, type Massage } from "../schema";
import { createMassage, updateMassage } from "../server";
import { useScrollLock } from "@/modules/core/client";

type Props = {
  open: boolean;
  onClose: () => void;
  service: Massage | null;
};

export function EditServiceDialog({ open, onClose, service }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [status, setStatus] = useState<Massage["status"]>("active");
  const [durations, setDurations] = useState<number[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeOnClick = useRef(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(service?.name ?? "");
      setDescription(service?.description ?? "");
      setDuration(service ? String(service.duration) : "");
      setPrice(service ? String(service.price) : "");
      setHourlyRate(service ? String(service.hourlyRate) : "");
      setStatus(service?.status ?? "active");
      setDurations(service?.durations ?? []);
      setImageFile(null);
      setImagePreview(null);
      setError(null);
    }
  }, [open, service]);

  useScrollLock(open);

  if (!open) return null;

  const displayImage = imagePreview ?? service?.image_url ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleSave() {
    const data = {
      name,
      description,
      duration: Number(duration),
      price: Number(price),
      hourlyRate: Number(hourlyRate),
      status,
    };
    setError(null);
    startTransition(async () => {
      const res = service
        ? await updateMassage(service.id, data, durations, imageFile)
        : await createMassage(data, durations, imageFile);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { closeOnClick.current = e.target === e.currentTarget; }}
      onClick={() => { if (closeOnClick.current) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="serif" style={{ fontSize: "18px" }}>{service ? "แก้ไขแผนนวด" : "เพิ่มแผนนวด"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: "120px",
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: "3px",
              background: "var(--surface)",
              overflow: "hidden",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "12.5px",
              padding: 0,
            }}
          >
            {displayImage ? (
              <img src={displayImage} alt="service" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>คลิกเพื่ออัปโหลดรูป</span>
            )}
          </button>

          <div className="field">
            <span className="lbl">ชื่อแผนนวด</span>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="lbl">คำอธิบาย</span>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: "none", lineHeight: "1.6" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div className="field">
              <span className="lbl">ระยะเวลา (นาที)</span>
              <input
                type="number"
                min={1}
                className="input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="field">
              <span className="lbl">ราคา (บาท)</span>
              <input
                type="number"
                min={0}
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <span className="lbl">ค่าแรง/ชม. (฿)</span>
              <input
                type="number"
                min={0}
                className="input"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <span className="lbl">ตัวเลือกระยะเวลา</span>
            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
                padding: "6px 8px", border: "1px solid var(--line)", borderRadius: "3px",
                background: "var(--surface)", minHeight: "38px",
              }}
            >
              {durations.map((d) => (
                <span
                  key={d}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "3px",
                    padding: "2px 8px", fontSize: "12px",
                    border: "1px solid var(--umber)", borderRadius: "3px",
                    color: "var(--umber)", whiteSpace: "nowrap",
                  }}
                >
                  {d} นาที
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDurations((prev) => prev.filter((x) => x !== d)); }}
                    style={{ lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: "var(--umber)", padding: "0 1px", fontSize: "13px" }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ marginTop: "6px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[30, 45, 60, 90, 120, 150, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { if (!durations.includes(d)) setDurations((prev) => [...prev, d].sort((a, b) => a - b)); }}
                    disabled={durations.includes(d)}
                    style={{
                      padding: "2px 7px", fontSize: "11px",
                      border: "1px solid var(--line)", borderRadius: "3px",
                      background: "transparent", cursor: durations.includes(d) ? "default" : "pointer",
                      color: durations.includes(d) ? "var(--muted)" : "var(--fg)",
                      opacity: durations.includes(d) ? 0.4 : 1,
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <span className="lbl">สถานะ</span>
            <select
              className="select-field"
              value={status}
              onChange={(e) => setStatus(e.target.value as Massage["status"])}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-foot">
          {error && (
            <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!name || pending}
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
