import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { STRINGS } from "@/lib/constants/strings";
import { BarChart3, Building2, ShieldAlert } from "lucide-react";

interface DashboardChartsProps {
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  buildingDistribution: { name: string; fullName: string; count: number }[];
}

export function DashboardCharts({
  statusDistribution,
  priorityDistribution,
  buildingDistribution,
}: DashboardChartsProps) {
  // Compute max values for proportional bar scaling
  const maxBuilding = Math.max(...buildingDistribution.map((b) => b.count), 1);
  const statusEntries = Object.entries(statusDistribution);
  const maxStatus = Math.max(...statusEntries.map(([, count]) => count), 1);

  const priorityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Tickets by Status */}
      <Card className="border-borderline shadow-sm">
        <CardHeader className="pb-3 border-b border-borderline">
          <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue" />
            Tickets by Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {statusEntries.map(([status, count]) => {
            const pct = Math.round((count / maxStatus) * 100);
            return (
              <div key={status} className="space-y-1 text-xs">
                <div className="flex justify-between text-navy font-medium">
                  <span>{STRINGS.status[status as keyof typeof STRINGS.status] || status}</span>
                  <span className="font-bold">{count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue transition-all"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 2. Tickets by Priority */}
      <Card className="border-borderline shadow-sm">
        <CardHeader className="pb-3 border-b border-borderline">
          <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue" />
            Tickets by Priority
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {priorityOrder.map((p) => {
            const count = priorityDistribution[p] || 0;
            const barColor =
              p === "CRITICAL"
                ? "bg-semantic-red"
                : p === "HIGH"
                ? "bg-semantic-orange"
                : p === "MEDIUM"
                ? "bg-semantic-amber"
                : "bg-semantic-slate";

            return (
              <div key={p} className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-navy font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                    {STRINGS.priority[p as keyof typeof STRINGS.priority] || p}
                  </span>
                  <span className="font-bold">{count}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all`}
                    style={{
                      width: `${Math.max(
                        Math.round((count / Math.max(...Object.values(priorityDistribution), 1)) * 100),
                        3
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Tickets by Campus Building */}
      <Card className="border-borderline shadow-sm">
        <CardHeader className="pb-3 border-b border-borderline">
          <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue" />
            Tickets by Building
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {buildingDistribution.map((b) => {
            const pct = Math.round((b.count / maxBuilding) * 100);
            return (
              <div key={b.name} className="space-y-1 text-xs">
                <div className="flex justify-between text-navy font-medium">
                  <span className="truncate pr-2" title={b.fullName}>
                    {b.name} ({b.fullName})
                  </span>
                  <span className="font-bold flex-shrink-0">{b.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky transition-all"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
