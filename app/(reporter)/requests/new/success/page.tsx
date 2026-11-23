import React from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, PlusCircle } from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";
import { Card, CardContent } from "@/components/ui/card";

export default function RequestSuccessPage({
  searchParams,
}: {
  searchParams: { ticket?: string };
}) {
  const ticketNo = searchParams.ticket || "CF-TICKET";

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4">
      <Card className="max-w-md w-full border-borderline shadow-lg text-center p-6 sm:p-8 space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-semantic-green mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-navy">
            {STRINGS.requestForm.successTitle}
          </h2>
          <p className="text-sm text-muted">
            {STRINGS.requestForm.successSubtitle}
          </p>
        </div>

        {/* Ticket Number Highlight */}
        <div className="p-4 rounded-lg bg-canvas border border-borderline">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
            {STRINGS.requestForm.ticketNoLabel}
          </span>
          <span className="text-2xl font-mono font-extrabold text-blue tracking-tight">
            {ticketNo}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/requests"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue hover:bg-blue-hover text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>{STRINGS.requestForm.trackButton}</span>
          </Link>

          <Link
            href="/requests/new"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-white hover:bg-ice/20 text-navy border border-borderline text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{STRINGS.requestForm.newAnotherButton}</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
