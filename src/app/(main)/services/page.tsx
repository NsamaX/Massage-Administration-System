import { getMassages } from "@/modules/services/server";
import { ServicesView } from "@/modules/services/client";

export default async function ServicesPage() {
  const massages = await getMassages();
  return <ServicesView massages={massages} />;
}
