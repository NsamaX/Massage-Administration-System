"use client";

import { useEffect, useTransition, useState, useRef } from "react";
import { type Employee } from "../schema";
import { createEmployee, updateEmployee } from "../server";
import { useScrollLock } from "@/modules/core/client";

function normalizeCodeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 3);
}

type FormState = {
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  skills: string[];
  employed: boolean;
};

export function StaffFormModal({ staff, allSkills, onClose }: {
  staff?: Employee;
  allSkills: string[];
  onClose: () => void;
}) {
  useScrollLock();
  const isEdit = staff !== undefined;

  const [form, setForm] = useState<FormState>({
    employeeCode: staff?.employeeCode ?? "",
    firstName: staff?.firstName ?? "",
    lastName: staff?.lastName ?? "",
    phone: staff?.phone ?? "",
    skills: staff?.skills ?? [],
    employed: staff?.employed ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeOnClick = useRef(false);

  const remaining = allSkills.filter((s) => !form.skills.includes(s));
  const displayImage = imagePreview ?? (isEdit ? (staff.imageUrl ?? null) : null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = "";
  }

  function handleCropCancel() { setCropOpen(false); setCropFile(null); }
  function handleCropSave(file: File) {
    setImageFile(file);
    setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setCropOpen(false);
    setCropFile(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updateEmployee(staff.id, { employeeCode: form.employeeCode, firstName: form.firstName, lastName: form.lastName, phone: form.phone, employed: form.employed, skills: form.skills }, imageFile)
        : await createEmployee({ employeeCode: form.employeeCode ?? "", firstName: form.firstName, lastName: form.lastName, phone: form.phone, skills: form.skills }, imageFile);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <>
      <div
        className="modal-backdrop"
        onMouseDown={(e) => { closeOnClick.current = e.target === e.currentTarget; }}
        onClick={() => { if (closeOnClick.current) onClose(); }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3 className="serif" style={{ fontSize: "18px" }}>
              {isEdit ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
            </h3>
            <button type="button" className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div className="field" style={{ margin: 0, flexShrink: 0 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "120px", height: "120px", borderRadius: "50%",
                    border: "1px solid var(--line)", background: "var(--surface)",
                    cursor: "pointer", overflow: "hidden", display: "grid", placeItems: "center",
                  }}
                >
                  {displayImage ? (
                    <img src={displayImage} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "var(--faint)", fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic", fontSize: "36px" }}>
                      {form.firstName[0] ?? "?"}
                    </span>
                  )}
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                <ModalField label="ชื่อ" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
                <ModalField label="นามสกุล" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
              </div>
            </div>

            <ModalField
              label="รหัสพนักงาน (3 หลัก)"
              value={form.employeeCode ?? ""}
              onChange={(v) => {
                const next = normalizeCodeInput(v);
                setForm((f) => ({ ...f, employeeCode: isEdit ? (next || null) : next }));
              }}
            />
            <ModalField label="เบอร์โทร" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />

            {isEdit && (
              <div className="field">
                <span className="lbl">สถานะ</span>
                <select
                  className="select-field"
                  value={form.employed ? "employed" : "terminated"}
                  onChange={(e) => {
                    const employed = e.target.value === "employed";
                    setForm((f) => ({ ...f, employed, employeeCode: employed ? f.employeeCode : null }));
                  }}
                >
                  <option value="employed">จ้างงาน</option>
                  <option value="terminated">เลิกจ้าง</option>
                </select>
              </div>
            )}

            <SkillPicker
              skills={form.skills}
              remaining={remaining}
              onAdd={(s) => setForm((f) => ({ ...f, skills: [...f.skills, s] }))}
              onRemove={(s) => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))}
            />
          </div>
          <div className="modal-foot">
            {error && <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>}
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>ยกเลิก</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={pending}>
              {pending ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
      {cropOpen && cropFile && (
        <ImageCropDialog file={cropFile} onCancel={handleCropCancel} onSave={handleCropSave} />
      )}
    </>
  );
}

function SkillPicker({ skills, remaining, onAdd, onRemove }: {
  skills: string[];
  remaining: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropWidth, setDropWidth] = useState<number>(180);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const CHIP_VARIANTS = ["", " chip-sage", " chip-clay", " chip-brass"];
  const DROPDOWN_HEIGHT = 205;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleOpen() {
    if (open) { setOpen(false); return; }

    const btn = btnRef.current;
    if (btn) setDropWidth(Math.max(btn.getBoundingClientRect().width, 180));

    setOpen(true);
    requestAnimationFrame(() => {
      const dropdown = dropRef.current;
      const wrap = wrapRef.current;
      if (!dropdown || !wrap) return;

      const modal = wrap.closest(".modal");
      const modalBody = wrap.closest(".modal-body");
      if (!modalBody) return;

      const modalBottom = modal ? modal.getBoundingClientRect().bottom - 8 : window.innerHeight - 8;
      const dropBottom = dropdown.getBoundingClientRect().bottom;
      if (dropBottom > modalBottom) {
        modalBody.scrollTop += dropBottom - modalBottom;
      }
    });
  }

  return (
    <div className="field" style={{ marginTop: "4px" }}>
      <span className="lbl">ทักษะ</span>
      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {skills.map((skill, i) => (
            <span key={skill} className={`chip chip-edit${CHIP_VARIANTS[i % 4]}`}>
              <span className="dot" />
              {skill}
              <span className="x" onClick={() => onRemove(skill)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onRemove(skill)}>×</span>
            </span>
          ))}
        </div>
      )}
      {remaining.length > 0 && (
        <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
          <button ref={btnRef} type="button" className="btn btn-ghost btn-sm" onClick={handleOpen}>
            + เลือกทักษะ
          </button>
          {open && (
            <div
              ref={dropRef}
              className="filter-dropdown"
              style={{
                left: 0,
                right: "auto",
                minWidth: dropWidth,
                maxHeight: DROPDOWN_HEIGHT,
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              {remaining.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="filter-item"
                  onClick={() => { onAdd(s); setOpen(false); }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModalField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}

function ImageCropDialog({ file, onCancel, onSave }: { file: File; onCancel: () => void; onSave: (file: File) => void }) {
  useScrollLock();
  const closeOnClick = useRef(false);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [objectUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  const cropSize = 320;
  const outSize = 512;
  const natural = imgEl ? { w: imgEl.naturalWidth, h: imgEl.naturalHeight } : null;
  const baseScale = natural ? cropSize / Math.min(natural.w, natural.h) : 1;
  const display = natural ? { w: natural.w * baseScale, h: natural.h * baseScale } : { w: cropSize, h: cropSize };

  function clampOffset(next: { x: number; y: number }, zoomValue: number = zoom) {
    const halfCrop = cropSize / 2;
    const halfW = (display.w * zoomValue) / 2;
    const halfH = (display.h * zoomValue) / 2;
    const maxX = Math.max(0, halfW - halfCrop);
    const maxY = Math.max(0, halfH - halfCrop);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!natural) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setOffset(clampOffset({ x: startRef.current.ox + dx, y: startRef.current.oy + dy }));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    startRef.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    setOffset((cur) => clampOffset(cur, next));
  }

  async function handleSave() {
    if (!imgEl || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const outScale = outSize / cropSize;
    const finalScale = baseScale * zoom;
    const drawW = natural.w * finalScale * outScale;
    const drawH = natural.h * finalScale * outScale;
    const x = outSize / 2 + offset.x * outScale - drawW / 2;
    const y = outSize / 2 + offset.y * outScale - drawH / 2;
    ctx.drawImage(imgEl, x, y, drawW, drawH);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    onSave(new File([blob], `employee-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 60 }}
      onMouseDown={(e) => { closeOnClick.current = e.target === e.currentTarget; }}
      onClick={() => { if (closeOnClick.current) onCancel(); }}
    >
      <div className="modal" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="serif" style={{ fontSize: "18px" }}>ครอปรูปพนักงาน</h3>
          <button type="button" className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{ padding: "20px" }}>
          <div
            style={{
              position: "relative",
              margin: "0 auto",
              width: cropSize,
              height: cropSize,
              overflow: "hidden",
              border: "1px solid var(--line)",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
              background: "var(--surface)",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={objectUrl}
              alt="crop"
              draggable={false}
              onLoad={(e) => { const el = e.currentTarget; setImgEl(el); setOffset({ x: 0, y: 0 }); setZoom(1); }}
              style={{
                position: "absolute", left: "50%", top: "50%", maxWidth: "none",
                width: display.w, height: display.h,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(28,25,23,.55)",
              pointerEvents: "none",
            }} />
          </div>
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="caps" style={{ whiteSpace: "nowrap" }}>ซูม</span>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); }}
            >รีเซ็ต</button>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!imgEl}>บันทึกรูป</button>
        </div>
      </div>
    </div>
  );
}
