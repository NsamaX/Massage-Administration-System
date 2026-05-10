"use client";

import { useState, useTransition } from "react";
import { deleteMassage } from "../server";
import type { Massage } from "../schema";

type Props = {
  open: boolean;
  onClose: () => void;
  service: Massage | null;
};

export function DeleteServiceDialog({ open, onClose, service }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open || !service) return null;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMassage(service!.id);
      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "20px", fontWeight: 500 }}>
            ยืนยันการลบ
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="ปิด">×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--ink-2)" }}>
            ต้องการลบ{" "}
            <strong style={{ color: "var(--ink)" }}>{service.name}</strong>{" "}
            ออกจากรายการบริการใช่หรือไม่ การดำเนินการนี้ไม่สามารถยกเลิกได้
          </p>
        </div>
        <div className="modal-foot">
          {error && <span style={{ marginRight: "auto", fontSize: "12px", color: "var(--danger)" }}>{error}</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>ยกเลิก</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDelete}
            disabled={pending}
            style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
          >
            {pending ? "กำลังลบ..." : "ลบบริการ"}
          </button>
        </div>
      </div>
    </div>
  );
}
