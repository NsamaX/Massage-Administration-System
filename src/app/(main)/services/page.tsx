import { getMassages } from "@/modules/services/server";
import { ServicesView } from "@/modules/services/client";
import { requireRole } from "@/modules/auth/server";

export default async function ServicesPage() {
  await requireRole(["dev", "admin"]);
  const massages = await getMassages();
  return <ServicesView massages={massages} />;
}
