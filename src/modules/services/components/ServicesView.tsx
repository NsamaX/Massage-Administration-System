"use client";

import { useState, useTransition } from "react";
import { EditServiceDialog } from "./EditServiceDialog";
import { deactivateMassage, reactivateMassage } from "../server";
import { STATUS_LABEL, type Massage } from "../schema";

const PH_COLORS = 5;

export function ServicesView({ massages }: { massages: Massage[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogService, setDialogService] = useState<Massage | null>(null);

  function handleEdit(service: Massage) {
    setDialogService(service);
    setDialogOpen(true);
  }

  function handleCreate() {
    setDialogService(null);
    setDialogOpen(true);
  }

  const active = massages.filter((m) => m.status === "active").length;
  const paused = massages.filter((m) => m.status === "paused").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">๐๕ · สตูดิโอ</div>
          <h1>แผนบริการ <em>ของร้าน</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">เปิด {active} · ปิดชั่วคราว {paused}</div>
        </div>
      </div>

      <div className="svc-grid">
        <button type="button" className="svc-card svc-add" onClick={handleCreate}>
          <div>
            <div className="plus">＋</div>
            <div className="lbl">เพิ่มแผนบริการ</div>
          </div>
        </button>
        {massages.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onEdit={() => handleEdit(service)}
          />
        ))}
      </div>

      <EditServiceDialog
        open={dialogOpen}
        service={dialogService}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

function ServiceCard({ service, onEdit }: { service: Massage; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [cardError, setCardError] = useState<string | null>(null);
  const inactive = service.status === "paused" || service.status === "inactive";

  function handleToggle() {
    setCardError(null);
    startTransition(async () => {
      const res = inactive
        ? await reactivateMassage(service.id)
        : await deactivateMassage(service.id);
      if (res.error) setCardError(res.error);
    });
  }

  const phClass = `svc-ph svc-ph-${(service.id % PH_COLORS) + 1}`;

  return (
    <div className={`svc-card${inactive ? " off" : ""}`}>
      {service.image_url
        ? <div className="svc-img"><img src={service.image_url} alt={service.name} /></div>
        : <div className={phClass} />
      }
      <div className="svc-body">
        <div className="nm">{service.name}</div>
        {service.description && <div className="desc">{service.description}</div>}
        <div className="meta">
          <span>฿{Number(service.price).toLocaleString()}</span>
          <span>· {service.durations.length > 1 ? service.durations.join(" / ") : service.duration} นาที</span>
          <span>ค่าแรง {Number(service.hourlyRate).toLocaleString()} ฿/ชม.</span>
        </div>
        <span className={`pill${inactive ? " off" : ""}`}>
          <span className="d" />{STATUS_LABEL[service.status]}
        </span>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>แก้ไข</button>
          <button
            type="button"
            className="btn-icon"
            style={{ border: "1px solid var(--line)" }}
            disabled={pending}
            onClick={handleToggle}
            aria-label={inactive ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
          >
            {inactive ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6a4 4 0 1 0 1.2-2.8M2 2v3h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4h8M5 4V2.5h2V4M3 4l.5 6h5L9 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        {cardError && <p style={{ fontSize: "11.5px", color: "var(--danger)" }}>{cardError}</p>}
      </div>
    </div>
  );
}
