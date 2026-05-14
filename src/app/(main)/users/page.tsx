import { getUsers, getAvailableEmployees } from "@/modules/users/server";
import { UsersView } from "@/modules/users/client";
import { requireRole } from "@/modules/auth/server";

export default async function UsersPage() {
  const user = await requireRole(["dev", "admin"]);
  const [users, availableEmployees] = await Promise.all([
    getUsers(),
    getAvailableEmployees(),
  ]);

  return (
    <UsersView
      users={users}
      availableEmployees={availableEmployees}
      currentUserId={user.id}
      currentUserRole={user.role as "dev" | "admin"}
    />
  );
}
