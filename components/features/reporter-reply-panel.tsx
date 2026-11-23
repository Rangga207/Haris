"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/toast";
import { HelpCircle, Send } from "lucide-react";

interface ReporterReplyPanelProps {
  ticketId: string;
  status: TicketStatus;
  latestNote?: string | null;
}

export function ReporterReplyPanel({
  ticketId,
  status,
  latestNote,
}: ReporterReplyPanelProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (status !== TicketStatus.NEEDS_INFO) {
    return null;
  }

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      toastError("Please enter your reply for the facilities dispatcher.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: TicketStatus.SUBMITTED,
          note: `Reporter replied: ${response.trim()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to submit response");
        setIsLoading(false);
        return;
      }

      toastSuccess("Response sent! Ticket returned to triage queue.");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 space-y-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-900">
            Action Required: Facilities Dispatcher Requested More Information
          </h4>
          {latestNote && (
            <p className="text-xs text-amber-800 mt-1 italic bg-amber-100/60 p-2 rounded border border-amber-200">
              &quot;{latestNote}&quot;
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSendResponse} className="space-y-3 pt-1">
        <Textarea
          placeholder="Type your response or additional location details here..."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={3}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="bg-amber-700 hover:bg-amber-800 text-white"
          isLoading={isLoading}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Submit Information to Dispatcher
        </Button>
      </form>
    </div>
  );
}
