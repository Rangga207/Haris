"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Menu, LogOut, Bell } from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";

interface TopBarProps {
  userName: string;
  userRole: Role;
  unreadNotifications?: number;
  onOpenMobileMenu?: () => void;
  title?: string;
}

export function TopBar({
  userName,
  userRole,
  unreadNotifications = 0,
  onOpenMobileMenu,
  title,
}: TopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const roleLabel = STRINGS.roles[userRole] || userRole;

  return (
    <header className="h-16 bg-white border-b border-borderline px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-md text-navy hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {title && (
          <h2 className="text-lg font-bold text-navy truncate">{title}</h2>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative p-2 rounded-full text-navy hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-semantic-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>

        {/* User Info */}
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-sm font-semibold text-navy leading-tight">
            {userName}
          </span>
          <span className="text-xs text-muted font-medium">{roleLabel}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-semantic-red hover:bg-red-50 border border-slate-200 transition-colors"
          title={STRINGS.auth.signOutButton}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{STRINGS.auth.signOutButton}</span>
        </button>
      </div>
    </header>
  );
}
