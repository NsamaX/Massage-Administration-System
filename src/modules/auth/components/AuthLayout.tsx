"use client";

import { useEffect, useState } from "react";
import { SignInForm } from "./SignInForm";
import type { AuthUser } from "../schema";

type Props = { users: AuthUser[] };

export function AuthLayout({ users }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <div className="login-m">
        <div className="login-m-header">
          <h1 className="login-title login-m-header-title">
            ma<span className="login-dot login-m-header-dot" />
            <em>sǎn</em>
          </h1>
        </div>
        <div className="login-m-body">
          <SignInForm users={users} />
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="lhs">
        <span className="caps">est. ๒๕๖๙</span>

        <div>
          <h1 className="login-title">
            ma<span className="login-dot" />
            <em>sǎn</em>
          </h1>
          <p className="login-lede">
            ระบบบริหารร้านนวด — จัดการนัดหมาย พนักงาน ห้องบริการ และรายได้ของร้านได้ในที่เดียว
            ออกแบบมาเพื่อความสงบในการทำงานของแอดมินและเจ้าของร้าน
          </p>
        </div>

        <div className="login-stamp">
          <span>massage</span>
          <span>management</span>
          <span>system</span>
        </div>
      </div>

      <div className="rhs">
        <div className="panel">
          <SignInForm users={users} />
        </div>
      </div>
    </div>
  );
}
