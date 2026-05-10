export const dynamic = "force-dynamic";

import { getAuthUsers } from "@/modules/auth/server";
import { AuthLayout } from "@/modules/auth/client";

export default async function Home() {
  const users = await getAuthUsers();
  return <AuthLayout users={users} />;
}
