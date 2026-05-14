import { getEntryOptions, getRecentEntries } from "@/modules/entry/server";
import { EntryView } from "@/modules/entry/client";
import { requireRole } from "@/modules/auth/server";

export default async function EntryPage() {
  await requireRole(["dev", "admin"]);
  const [options, entries] = await Promise.all([
    getEntryOptions(),
    getRecentEntries(),
  ]);
  return <EntryView options={options} initialEntries={entries} />;
}
