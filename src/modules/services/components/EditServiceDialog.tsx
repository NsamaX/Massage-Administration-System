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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(service?.name ?? "");
      setDescription(service?.description ?? "");
      setDuration(service ? String(service.duration) : "");
      setPrice(service ? String(service.price) : "");
      setHourlyRate(service ? String(service.hourlyRate) : "");
      setStatus(service?.status ?? "active");
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
        ? await updateMassage(service.id, data, imageFile)
        : await createMassage(data, imageFile);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        {/* Head */}
        <div className="modal-head">
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: 500 }}>
            {service ? "แก้ไขแผนนวด" : "เพิ่มแผนนวด"}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>

        {/* Body */}
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

        {/* Footer */}
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
