"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { FileDropzone } from "../ui/file-dropzone";
import { useToast } from "../ui/toast";
import { Play, Pause, CheckCircle2, AlertCircle } from "lucide-react";

interface TechnicianActionPanelProps {
  ticketId: string;
  status: TicketStatus;
}

export function TechnicianActionPanel({
  ticketId,
  status,
}: TechnicianActionPanelProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [modalMode, setModalMode] = useState<"hold" | "resolve" | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Start Job (ASSIGNED -> IN_PROGRESS) or Resume (ON_HOLD -> IN_PROGRESS)
  const handleStartOrResume = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: TicketStatus.IN_PROGRESS,
          note: status === TicketStatus.ON_HOLD ? "Technician resumed work" : "Technician started work on site",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to update status");
        setIsLoading(false);
        return;
      }

      toastSuccess("Job marked as In Progress!");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  // 2. Put On Hold (IN_PROGRESS -> ON_HOLD)
  const handlePutOnHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdReason.trim()) {
      toastError("Please provide a reason for placing this job on hold.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: TicketStatus.ON_HOLD,
          reason: holdReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to put on hold");
        setIsLoading(false);
        return;
      }

      toastSuccess("Job placed on hold.");
      setModalMode(null);
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  // 3. Mark Resolved (IN_PROGRESS -> RESOLVED)
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionNotes.trim()) {
      toastError("Please describe the work completed and resolution details.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("status", TicketStatus.RESOLVED);
      formData.append("note", completionNotes.trim());
      if (afterPhotoFile) {
        formData.append("photo", afterPhotoFile);
      }

      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to resolve job");
        setIsLoading(false);
        return;
      }

      toastSuccess("Job marked as RESOLVED! Reporter will be notified.");
      setModalMode(null);
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-canvas border border-borderline rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy">
            Technician Job Actions
          </h3>
          <p className="text-xs text-muted">
            Current status: <span className="font-semibold text-navy">{status}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {status === TicketStatus.ASSIGNED && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleStartOrResume}
              isLoading={isLoading}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Start Work
            </Button>
          )}

          {status === TicketStatus.ON_HOLD && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleStartOrResume}
              isLoading={isLoading}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Resume Work
            </Button>
          )}

          {status === TicketStatus.IN_PROGRESS && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalMode("hold")}
              >
                <Pause className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Put On Hold
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setModalMode("resolve")}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Resolve Ticket
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modal: Put on hold */}
      {modalMode === "hold" && (
        <form onSubmit={handlePutOnHold} className="pt-3 border-t border-borderline space-y-3">
          <Textarea
            label="Reason for Hold (Required)"
            placeholder="e.g. Waiting for replacement capacitor from warehouse..."
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            required
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Confirm Hold
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalMode(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Modal: Resolve job */}
      {modalMode === "resolve" && (
        <form onSubmit={handleResolve} className="pt-3 border-t border-borderline space-y-4">
          <Textarea
            label="Work Completion Notes (Required)"
            placeholder="Describe the repair actions taken and test results..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            required
            rows={3}
          />

          <FileDropzone
            onFileSelect={(file) => setAfterPhotoFile(file)}
          />

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              isLoading={isLoading}
            >
              Submit Completion & Resolve
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalMode(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
