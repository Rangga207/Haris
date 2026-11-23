import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Shield, Wrench, UserCheck, CheckCircle } from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";

export default async function UsersDirectoryPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          reportedTickets: true,
          assignedTickets: true,
        },
      },
    },
  });

  return (
    <AppShell user={session} pageTitle="User Directory">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">
            User Accounts & Roles
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage authenticated users, roles, and technician specializations.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue" />
              <CardTitle>Registered Users ({users.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderline text-xs">
                <thead>
                  <tr className="text-left font-semibold text-navy bg-canvas">
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Tickets Activity</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-ice/15">
                      <td className="p-3 font-semibold text-navy">{u.name}</td>
                      <td className="p-3 text-muted">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-semibold text-[11px] ${
                            u.role === Role.ADMIN
                              ? "bg-purple-100 text-purple-800"
                              : u.role === Role.UNIT_HEAD
                              ? "bg-blue/15 text-blue"
                              : u.role === Role.TECHNICIAN
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STRINGS.roles[u.role] || u.role}
                        </span>
                      </td>
                      <td className="p-3 text-muted">
                        {u.specialization ? (
                          <span className="capitalize font-medium text-navy">
                            {u.specialization}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-muted">{u.phone || "-"}</td>
                      <td className="p-3 text-muted">
                        {u.role === Role.TECHNICIAN
                          ? `${u._count.assignedTickets} assigned`
                          : `${u._count.reportedTickets} reported`}
                      </td>
                      <td className="p-3">
                        {u.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-semantic-red font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
