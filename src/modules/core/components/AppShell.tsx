"use client";

import { useState, type ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import type { AuthUser } from "@/modules/auth/schema";
import { ROLE_LABEL } from "@/modules/auth/schema";

type Props = {
  user: AuthUser | null;
  signOut: () => Promise<void>;
  children: ReactNode;
};

export function AppShell({ user, signOut, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="m-bar">
        <div className="wm">
          R<span className="dot" />
          <em>Ǐch</em>
        </div>
        <button
          type="button"
          className="m-burger"
          onClick={() => setMenuOpen(true)}
          aria-label="เมนู"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 4h10M2 7h10M2 10h10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`m-overlay${menuOpen ? " open" : ""}`}
        onClick={close}
      />

      <div className="app">
        {/* Sidebar */}
        <aside className={`sidebar${menuOpen ? " open" : ""}`}>
          <div className="wordmark" style={{ cursor: "default" }}>
            <div className="wm-name">
              R<span className="dot" />
              <em>Ǐch</em>
            </div>
          </div>

          <nav className="nav">
            <SidebarNav role={user?.role ?? null} onNavigate={close} />
          </nav>

          <div className="side-foot">
            {user && (
              <div className="side-who">
                <div className="side-av">{user.name[0]}</div>
                <div>
                  <div className="side-who-name">{user.name}</div>
                  <div className="side-who-role">{ROLE_LABEL[user.role]}</div>
                </div>
              </div>
            )}
            <form action={signOut}>
              <button type="submit" className="logout-btn">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M5 12H2V2h3M9 9.5L11.5 7 9 4.5M11.5 7H5"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="main">{children}</main>
      </div>
    </>
  );
}
