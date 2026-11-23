import React from "react";
import { format } from "date-fns";
import { StatusChip } from "../ui/status-chip";
import { PriorityChip } from "@/components/ui/priority-chip";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Timeline, StatusHistoryItem } from "./timeline";
import { TicketStatus, Priority, Channel, Role } from "@prisma/client";
import {
  Building2,
  DoorOpen,
  Calendar,
  AlertTriangle,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";

export interface TicketDetailData {
  id: string;
  ticketNo: string;
  channel: Channel;
  description: string;
  isSafetyHazard: boolean;
  priority: Priority;
  status: TicketStatus;
  targetDate?: string | Date | null;
  holdReason?: string | null;
  resolvedAt?: string | Date | null;
  closedAt?: string | Date | null;
  createdAt: string | Date;
  isOverdue?: boolean;
  reporter: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  assignee?: {
    id: string;
    name: string;
    specialization?: string | null;
    phone?: string | null;
  } | null;
  building: {
    id: string;
    code: string;
    name: string;
  };
  room: {
    id: string;
    name: string;
    floor?: string | null;
  };
  category: {
    id: string;
    name: string;
    defaultPriority?: Priority;
  };
  attachments?: {
    id: string;
    fileUrl: string;
    kind: "BEFORE" | "AFTER";
    createdAt: string | Date;
  }[];
  statusHistory?: StatusHistoryItem[];
}

export function TicketDetailView({
  ticket,
  actionSlot,
}: {
  ticket: TicketDetailData;
  actionSlot?: React.ReactNode;
}) {
  const beforePhotos = ticket.attachments?.filter((a) => a.kind === "BEFORE") || [];
  const afterPhotos = ticket.attachments?.filter((a) => a.kind === "AFTER") || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hold Warning */}
      {ticket.status === TicketStatus.ON_HOLD && ticket.holdReason && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Ticket is Currently On Hold: </span>
            <p className="mt-0.5">{ticket.holdReason}</p>
          </div>
        </div>
      )}

      {/* Main Ticket Information Card */}
      <Card className="border-borderline shadow-sm overflow-hidden">
        {/* Ticket Header Bar */}
        <div className="px-6 py-4 bg-navy text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              {ticket.ticketNo}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-blue text-sky font-semibold">
              {STRINGS.channel[ticket.channel] || ticket.channel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PriorityChip priority={ticket.priority} isOverdue={ticket.isOverdue} />
            <StatusChip status={ticket.status} />
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Action Slot (Triage, Technician Actions, or Reporter Replies) */}
          {actionSlot && <div className="pb-4 border-b border-borderline">{actionSlot}</div>}

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Building & Room */}
            <div className="p-3 rounded-lg bg-canvas border border-borderline space-y-1">
              <span className="text-muted font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue" />
                Location
              </span>
              <p className="font-bold text-navy text-sm">{ticket.building.name}</p>
              <p className="text-muted">
                {ticket.room.name} {ticket.room.floor ? `(${ticket.room.floor})` : ""}
              </p>
            </div>

            {/* Category */}
            <div className="p-3 rounded-lg bg-canvas border border-borderline space-y-1">
              <span className="text-muted font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue" />
                Category
              </span>
              <p className="font-bold text-navy text-sm">{ticket.category.name}</p>
              {ticket.isSafetyHazard && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-semantic-red">
                  <AlertTriangle className="w-3 h-3" /> Safety Hazard
                </span>
              )}
            </div>

            {/* Reporter Info */}
            <div className="p-3 rounded-lg bg-canvas border border-borderline space-y-1">
              <span className="text-muted font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue" />
                Reported By
              </span>
              <p className="font-bold text-navy text-sm">{ticket.reporter.name}</p>
              <p className="text-muted truncate">{ticket.reporter.email}</p>
              {ticket.reporter.phone && (
                <p className="text-muted">{ticket.reporter.phone}</p>
              )}
            </div>

            {/* Assignee & Dates */}
            <div className="p-3 rounded-lg bg-canvas border border-borderline space-y-1">
              <span className="text-muted font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue" />
                Assignee & Target Date
              </span>
              {ticket.assignee ? (
                <div>
                  <p className="font-bold text-navy text-sm">{ticket.assignee.name}</p>
                  <p className="text-muted capitalize">
                    {ticket.assignee.specialization || "General"}
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 italic">Unassigned</p>
              )}
              {ticket.targetDate && (
                <p className="text-[11px] font-semibold text-navy mt-1">
                  Due: {format(new Date(ticket.targetDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
              Issue Description
            </h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-borderline text-sm text-body leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Photos Gallery (Before & After) */}
          {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue" />
                Attached Photos
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {beforePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border border-borderline rounded-lg p-2 bg-canvas space-y-1"
                  >
                    <span className="text-[11px] font-bold text-navy px-2 py-0.5 rounded bg-ice/40 inline-block mb-1">
                      Before Inspection
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.fileUrl}
                      alt="Before maintenance photo"
                      className="w-full h-48 object-cover rounded border border-borderline cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => window.open(photo.fileUrl, "_blank")}
                    />
                  </div>
                ))}

                {afterPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border border-borderline rounded-lg p-2 bg-canvas space-y-1"
                  >
                    <span className="text-[11px] font-bold text-emerald-800 px-2 py-0.5 rounded bg-emerald-100 inline-block mb-1">
                      After Resolution
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.fileUrl}
                      alt="After maintenance completion photo"
                      className="w-full h-48 object-cover rounded border border-borderline cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => window.open(photo.fileUrl, "_blank")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline of Status History */}
          <div className="pt-4 border-t border-borderline space-y-4">
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider">
              Status & Activity Timeline
            </h4>
            <Timeline history={ticket.statusHistory || []} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
