import type { ReactNode } from "react";

import { signOut, getCurrentUser } from "@/modules/auth/server";
import { AppShell } from "./AppShell";

type Props = { children: ReactNode };

export async function Layout({ children }: Props) {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} signOut={signOut}>
      {children}
    </AppShell>
  );
}
