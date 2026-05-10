"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "dev" | "admin" | "staff" | null;

type NavItem = {
  href: string;
  num: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard",    num: "01", label: "ภาพรวม"  },
      { href: "/appointments", num: "02", label: "นัดหมาย"  },
      { href: "/entry",        num: "03", label: "ลงข้อมูล" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/staff",    num: "04", label: "พนักงาน" },
      { href: "/services", num: "05", label: "บริการ"  },
    ],
  },
  {
    label: "Insight",
    items: [
      { href: "/report", num: "06", label: "รายงาน" },
      { href: "/users",  num: "07", label: "ผู้ใช้"  },
    ],
  },
];

const ALLOWED: Record<NonNullable<Role>, string[]> = {
  dev:   ["/dashboard", "/appointments", "/entry", "/staff", "/services", "/report", "/users"],
  admin: ["/dashboard", "/entry", "/staff", "/services", "/report", "/users"],
  staff: ["/dashboard", "/appointments", "/staff"],
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  role: Role;
  onNavigate?: () => void;
};

export function SidebarNav({ role, onNavigate }: Props) {
  const pathname = usePathname() ?? "/";
  const allowed = role ? (ALLOWED[role] ?? []) : [];

  const visibleGroups = ALL_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => allowed.includes(item.href)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <div className="group-label">{group.label}</div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
                onClick={onNavigate}
              >
                <span className="num">{item.num}</span>
                <span className="lbl">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
