"use client";

import { useState } from "react";
import type { EntryOptions, RecentEntry } from "../schema";
import { EntryForm } from "./EntryForm";
import { RecentEntriesTable } from "./RecentEntriesTable";

type Props = {
  options: EntryOptions;
  initialEntries: RecentEntry[];
};

export function EntryView({ options, initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">๐๓ · พื้นที่ทำงาน</div>
          <h1>ลงข้อมูล<em> นัดหมาย</em></h1>
        </div>
        <div className="page-head-meta">
          <div className="caps">รายการที่บันทึก {entries.length} รายการ</div>
        </div>
      </div>

      <EntryForm options={options} onSaved={setEntries} />
      <div className="section">
        <RecentEntriesTable entries={entries} />
      </div>
    </>
  );
}
