import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, DoorOpen, Tags } from "lucide-react";

export default async function MasterDataPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/login");
  }

  const [buildings, rooms, categories] = await Promise.all([
    db.building.findMany({
      orderBy: { code: "asc" },
      include: { _count: { select: { rooms: true, tickets: true } } },
    }),
    db.room.findMany({
      orderBy: { name: "asc" },
      include: {
        building: { select: { code: true, name: true } },
        _count: { select: { tickets: true } },
      },
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tickets: true } } },
    }),
  ]);

  return (
    <AppShell user={session} pageTitle="Master Data Management">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">
            Master Data Directory
          </h1>
          <p className="text-sm text-muted mt-1">
            Overview of configured campus buildings, rooms, and issue categories.
          </p>
        </div>

        {/* 1. Buildings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue" />
              <CardTitle>Campus Buildings ({buildings.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderline text-xs">
                <thead>
                  <tr className="text-left font-semibold text-navy bg-canvas">
                    <th className="p-3">Code</th>
                    <th className="p-3">Building Name</th>
                    <th className="p-3">Rooms Configured</th>
                    <th className="p-3">Total Tickets</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {buildings.map((b) => (
                    <tr key={b.id} className="hover:bg-ice/15">
                      <td className="p-3 font-bold text-blue">{b.code}</td>
                      <td className="p-3 text-body font-medium">{b.name}</td>
                      <td className="p-3 text-muted">{b._count.rooms} rooms</td>
                      <td className="p-3 text-muted">{b._count.tickets} tickets</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 2. Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-blue" />
              <CardTitle>Issue Categories ({categories.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderline text-xs">
                <thead>
                  <tr className="text-left font-semibold text-navy bg-canvas">
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Default Priority</th>
                    <th className="p-3">Total Tickets</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-ice/15">
                      <td className="p-3 font-semibold text-navy">{c.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                          {c.defaultPriority}
                        </span>
                      </td>
                      <td className="p-3 text-muted">{c._count.tickets} tickets</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Rooms Sample */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-blue" />
              <CardTitle>Rooms & Locations ({rooms.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderline text-xs">
                <thead>
                  <tr className="text-left font-semibold text-navy bg-canvas">
                    <th className="p-3">Room Name</th>
                    <th className="p-3">Building</th>
                    <th className="p-3">Floor</th>
                    <th className="p-3">Total Tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {rooms.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-ice/15">
                      <td className="p-3 font-medium text-navy">{r.name}</td>
                      <td className="p-3 text-muted">{r.building.name} ({r.building.code})</td>
                      <td className="p-3 text-muted">{r.floor || "-"}</td>
                      <td className="p-3 text-muted">{r._count.tickets} tickets</td>
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
