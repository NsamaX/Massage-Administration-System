export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

import { Layout } from "@/modules/core/server";

type Props = {
  children: ReactNode;
};

export default function MainLayout({ children }: Props) {
  return <Layout>{children}</Layout>;
}
