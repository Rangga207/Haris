"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Priority, TicketStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { useToast } from "../ui/toast";
import {
  Wrench,
  AlertCircle,
  HelpCircle,
  XCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { calculateSuggestedTargetDate } from "@/lib/priority";

interface Technician {
  id: string;
  name: string;
  specialization: string;
  activeJobsCount: number;
  criticalJobsCount: number;
}

interface TriagePanelProps {
  ticketId: string;
  currentPriority: Priority;
  suggestedPriority: Priority;
  currentStatus: TicketStatus;
  currentAssigneeId?: string | null;
  currentTargetDate?: string | Date | null;
}

export function TriagePanel({
  ticketId,
  currentPriority,
  suggestedPriority,
  currentStatus,
  currentAssigneeId,
  currentTargetDate,
}: TriagePanelProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"assign" | "priority" | "info" | "reject">("assign");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState(currentAssigneeId || "");

  // Default suggested target date
  const defaultTargetDate = calculateSuggestedTargetDate(currentPriority)
    .toISOString()
    .slice(0, 10);
  const [targetDate, setTargetDate] = useState(
    currentTargetDate
      ? new Date(currentTargetDate).toISOString().slice(0, 10)
      : defaultTargetDate
  );

  const [assignNote, setAssignNote] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>(currentPriority);
  const [priorityReason, setPriorityReason] = useState("");
  const [infoQuestion, setInfoQuestion] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadTechnicians() {
      try {
        const res = await fetch("/api/technicians");
        const data = await res.json();
        if (data.technicians) setTechnicians(data.technicians);
      } catch {
        toastError("Failed to load technicians");
      }
    }
    loadTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update target date recommendation if priority changes
  const handlePrioritySelect = (p: Priority) => {
    setNewPriority(p);
    setTargetDate(calculateSuggestedTargetDate(p).toISOString().slice(0, 10));
  };

  // 1. Assign Technician Handler
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech) {
      toastError("Please select a technician");
      return;
    }
    if (!targetDate) {
      toastError("Please select a target completion date");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: selectedTech,
          targetDate: new Date(targetDate).toISOString(),
          note: assignNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Assignment failed");
        setIsLoading(false);
        return;
      }

      toastSuccess("Technician assigned and target date set!");
      router.refresh();
    } catch {
      toastError("Network error while assigning technician");
      setIsLoading(false);
    }
  };

  // 2. Priority Override Handler
  const handleUpdatePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPriority !== suggestedPriority && !priorityReason.trim()) {
      toastError("A justification reason is required when departing from suggested priority.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: newPriority,
          reason: priorityReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Priority update failed");
        setIsLoading(false);
        return;
      }

      toastSuccess("Priority successfully updated!");
      router.refresh();
    } catch {
      toastError("Network error while updating priority");
      setIsLoading(false);
    }
  };

  // 3. Request Info Handler
  const handleRequestInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoQuestion.trim()) {
      toastError("Please enter your question for the reporter");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: TicketStatus.NEEDS_INFO,
          reason: infoQuestion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to request info");
        setIsLoading(false);
        return;
      }

      toastSuccess("Information requested from reporter.");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  // 4. Reject Ticket Handler
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toastError("Please enter a reason for rejecting the complaint");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: TicketStatus.REJECTED,
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to reject ticket");
        setIsLoading(false);
        return;
      }

      toastSuccess("Ticket rejected.");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-canvas border border-borderline rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-borderline pb-3">
        <h3 className="text-sm font-bold text-navy flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue" />
          Dispatcher Triage & Management Panel
        </h3>

        {/* Action Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-borderline text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("assign")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === "assign"
                ? "bg-blue text-white"
                : "text-navy hover:bg-slate-100"
            }`}
          >
            Assign Tech
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("priority")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === "priority"
                ? "bg-blue text-white"
                : "text-navy hover:bg-slate-100"
            }`}
          >
            Adjust Priority
          </button>
          {currentStatus === TicketStatus.SUBMITTED && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === "info"
                    ? "bg-amber-600 text-white"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                Needs Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reject")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === "reject"
                    ? "bg-semantic-red text-white"
                    : "text-semantic-red hover:bg-red-50"
                }`}
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* 1. Tab: Assign Technician */}
      {activeTab === "assign" && (
        <form onSubmit={handleAssign} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Assign Technician"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              required
            >
              <option value="">Choose technician...</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialization}) — {t.activeJobsCount} active jobs
                  {t.criticalJobsCount > 0 ? ` (${t.criticalJobsCount} critical)` : ""}
                </option>
              ))}
            </Select>

            <Input
              type="date"
              label="Target Completion Date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              hint={`Suggested working day target: ${calculateSuggestedTargetDate(currentPriority).toLocaleDateString()}`}
              required
            />
          </div>

          <Input
            label="Assignment Note / Instructions (Optional)"
            placeholder="e.g. Bring replacement 40W fluorescent ballast tubes"
            value={assignNote}
            onChange={(e) => setAssignNote(e.target.value)}
          />

          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {currentAssigneeId ? "Reassign Technician" : "Confirm Assignment"}
          </Button>
        </form>
      )}

      {/* 2. Tab: Adjust Priority */}
      {activeTab === "priority" && (
        <form onSubmit={handleUpdatePriority} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Select
              label="Select Priority"
              value={newPriority}
              onChange={(e) => handlePrioritySelect(e.target.value as Priority)}
            >
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>
                  {p} {p === suggestedPriority ? "(Suggested)" : ""}
                </option>
              ))}
            </Select>

            <div className="p-2 rounded bg-ice/25 border border-ice text-xs text-navy">
              Suggested: <span className="font-bold">{suggestedPriority}</span>
            </div>
          </div>

          {newPriority !== suggestedPriority && (
            <Textarea
              label="Justification Reason (Required when diverging from suggested priority)"
              placeholder="State why this ticket requires higher or lower priority..."
              rows={2}
              value={priorityReason}
              onChange={(e) => setPriorityReason(e.target.value)}
              required
            />
          )}

          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Save Priority Change
          </Button>
        </form>
      )}

      {/* 3. Tab: Needs Info */}
      {activeTab === "info" && (
        <form onSubmit={handleRequestInfo} className="space-y-3">
          <Textarea
            label="Question for Reporter"
            placeholder="Specify what additional details, photos, or clarification are needed..."
            rows={2}
            value={infoQuestion}
            onChange={(e) => setInfoQuestion(e.target.value)}
            required
          />
          <Button type="submit" variant="secondary" size="sm" isLoading={isLoading}>
            Send Question to Reporter
          </Button>
        </form>
      )}

      {/* 4. Tab: Reject */}
      {activeTab === "reject" && (
        <form onSubmit={handleReject} className="space-y-3">
          <Textarea
            label="Reason for Rejection"
            placeholder="Explain why this request is out of facilities scope or cannot be serviced..."
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <Button type="submit" variant="danger" size="sm" isLoading={isLoading}>
            Confirm Rejection
          </Button>
        </form>
      )}
    </div>
  );
}
