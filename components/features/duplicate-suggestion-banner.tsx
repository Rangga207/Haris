"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

interface DuplicateTicket {
  id: string;
  ticketNo: string;
  description: string;
  createdAt: string;
  reporter: { name: string };
}

interface DuplicateSuggestionBannerProps {
  ticketId: string;
  isPrimary?: boolean;
}

export function DuplicateSuggestionBanner({
  ticketId,
}: DuplicateSuggestionBannerProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [duplicates, setDuplicates] = useState<DuplicateTicket[]>([]);
  const [selectedPrimary, setSelectedPrimary] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    async function checkDuplicates() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/duplicates`);
        if (res.ok) {
          const data = await res.json();
          if (data.duplicates && data.duplicates.length > 0) {
            setDuplicates(data.duplicates);
            setSelectedPrimary(data.duplicates[0].id);
          }
        }
      } catch {
        // Silently skip duplicate check
      }
    }
    checkDuplicates();
  }, [ticketId]);

  if (duplicates.length === 0) {
    return null;
  }

  const handleMerge = async () => {
    if (!selectedPrimary) return;
    setIsMerging(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryTicketId: selectedPrimary,
          reason: "Identified duplicate complaint in identical campus room & category.",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to merge tickets");
        setIsMerging(false);
        return;
      }

      toastSuccess("Ticket merged as duplicate successfully!");
      router.refresh();
    } catch {
      toastError("Network error while merging tickets");
      setIsMerging(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-sky/15 border border-sky/50 text-navy space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Copy className="w-5 h-5 text-blue flex-shrink-0" />
        <h4 className="text-xs sm:text-sm font-bold">
          Potential Duplicate Detected ({duplicates.length} open tickets in same room & category)
        </h4>
      </div>

      <p className="text-xs text-muted">
        Earlier active tickets were found for this exact location. You can merge this request into an existing primary ticket to streamline technician workload.
      </p>

      <div className="space-y-2">
        {duplicates.map((d) => (
          <div
            key={d.id}
            onClick={() => setSelectedPrimary(d.id)}
            className={`p-2.5 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
              selectedPrimary === d.id
                ? "bg-white border-blue shadow-sm"
                : "bg-white/60 border-borderline hover:bg-white"
            }`}
          >
            <div>
              <span className="font-bold text-blue mr-2">{d.ticketNo}</span>
              <span className="text-navy">{d.reporter.name}: </span>
              <span className="text-muted truncate inline-block max-w-xs align-bottom">
                {d.description}
              </span>
            </div>

            <input
              type="radio"
              name="primaryTicket"
              checked={selectedPrimary === d.id}
              onChange={() => setSelectedPrimary(d.id)}
              className="text-blue"
            />
          </div>
        ))}
      </div>

      <div className="pt-1">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleMerge}
          isLoading={isMerging}
        >
          Merge this Ticket into Primary
        </Button>
      </div>
    </div>
  );
}
