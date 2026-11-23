"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import {
  Inbox,
  PlusCircle,
  ClipboardList,
  LayoutDashboard,
  Database,
  Users,
  Bell,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";
import { cn } from "../ui/button";

interface SidebarProps {
  userRole: Role;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ userRole, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const getNavLinks = () => {
    switch (userRole) {
      case Role.REPORTER:
        return [
          {
            href: "/requests",
            label: STRINGS.nav.myRequests,
            icon: ClipboardList,
            matchPrefix: "/requests",
            exact: true,
          },
          {
            href: "/requests/new",
            label: STRINGS.nav.newRequest,
            icon: PlusCircle,
            matchPrefix: "/requests/new",
          },
          {
            href: "/notifications",
            label: STRINGS.nav.notifications,
            icon: Bell,
            matchPrefix: "/notifications",
          },
        ];

      case Role.ADMIN:
        return [
          {
            href: "/inbox",
            label: STRINGS.nav.inbox,
            icon: Inbox,
            matchPrefix: "/inbox",
          },
          {
            href: "/tickets/new",
            label: "Create on Behalf",
            icon: PlusCircle,
            matchPrefix: "/tickets/new",
          },
          {
            href: "/dashboard",
            label: STRINGS.nav.dashboard,
            icon: LayoutDashboard,
            matchPrefix: "/dashboard",
          },
          {
            href: "/admin/master-data",
            label: STRINGS.nav.masterData,
            icon: Database,
            matchPrefix: "/admin/master-data",
          },
          {
            href: "/admin/users",
            label: STRINGS.nav.users,
            icon: Users,
            matchPrefix: "/admin/users",
          },
          {
            href: "/notifications",
            label: STRINGS.nav.notifications,
            icon: Bell,
            matchPrefix: "/notifications",
          },
        ];

      case Role.TECHNICIAN:
        return [
          {
            href: "/jobs",
            label: STRINGS.nav.myJobs,
            icon: Wrench,
            matchPrefix: "/jobs",
          },
          {
            href: "/notifications",
            label: STRINGS.nav.notifications,
            icon: Bell,
            matchPrefix: "/notifications",
          },
        ];

      case Role.UNIT_HEAD:
        return [
          {
            href: "/dashboard",
            label: STRINGS.nav.dashboard,
            icon: LayoutDashboard,
            matchPrefix: "/dashboard",
          },
          {
            href: "/inbox",
            label: STRINGS.nav.inbox,
            icon: Inbox,
            matchPrefix: "/inbox",
          },
          {
            href: "/notifications",
            label: STRINGS.nav.notifications,
            icon: Bell,
            matchPrefix: "/notifications",
          },
        ];

      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside
      className={cn(
        "w-64 bg-navy text-white flex flex-col h-full border-r border-navy-light select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-navy-light/60 gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue flex items-center justify-center text-white font-bold text-lg shadow">
          CF
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight leading-none text-white">
            {STRINGS.app.name}
          </h1>
          <p className="text-[11px] text-sky font-medium mt-1">
            {STRINGS.app.facilitiesUnit}
          </p>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {navLinks.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.matchPrefix);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-blue text-white font-semibold border-l-4 border-sky shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-navy-light/50"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-sky" : "text-slate-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Emergency Phone Callout Footer */}
      <div className="p-4 mx-3 mb-4 rounded-lg bg-navy-light/40 border border-navy-light/80 text-xs">
        <div className="flex items-center gap-2 text-sky font-semibold mb-1">
          <ShieldAlert className="w-4 h-4 text-sky" />
          <span>Campus Emergency</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          {process.env.NEXT_PUBLIC_EMERGENCY_PHONE || "+62 21 555-0911 / Ext 911"}
        </p>
      </div>
    </aside>
  );
}
