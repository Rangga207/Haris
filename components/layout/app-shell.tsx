"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { X } from "lucide-react";

import { JWTPayload } from "@/lib/auth";

interface AppShellProps {
  user: JWTPayload | {
    id: string;
    name: string;
    email: string;
    role: Role;
    specialization?: string | null;
  };
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppShell({ user, children, pageTitle }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0 w-64 fixed inset-y-0 z-40">
        <Sidebar userRole={user.role} />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-navy z-50">
            <div className="absolute top-2 right-2 p-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white hover:text-sky p-1 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <Sidebar
              userRole={user.role}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen">
        <TopBar
          userName={user.name}
          userRole={user.role}
          title={pageTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
