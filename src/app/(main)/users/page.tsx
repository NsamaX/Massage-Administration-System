import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUsers, getAvailableEmployees } from "@/modules/users/server";
import { UsersView } from "@/modules/users/client";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("mas-session")?.value;
  if (!session) redirect("/");

  const data = JSON.parse(Buffer.from(session, "base64").toString("utf8")) as {
    userId: number;
    role: string;
  };
  if (data.role !== "admin" && data.role !== "dev") redirect("/dashboard");

  const [users, availableEmployees] = await Promise.all([
    getUsers(),
    getAvailableEmployees(),
  ]);

  return (
    <UsersView
      users={users}
      availableEmployees={availableEmployees}
      currentUserId={data.userId}
      currentUserRole={data.role as "dev" | "admin"}
    />
  );
}
