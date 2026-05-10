import { getEntryOptions, getRecentEntries } from "@/modules/entry/server";
import { EntryView } from "@/modules/entry/client";

export default async function EntryPage() {
  const [options, entries] = await Promise.all([
    getEntryOptions(),
    getRecentEntries(),
  ]);
  return <EntryView options={options} initialEntries={entries} />;
}
