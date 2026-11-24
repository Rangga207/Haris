"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketStatus } from "@prisma/client";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/toast";
import { Star, CheckCircle2, RotateCcw, MessageSquare, AlertCircle } from "lucide-react";
import { isWithinReopenWindow } from "@/lib/closure-service";

interface ClosureFeedbackPanelProps {
  ticketId: string;
  status: TicketStatus;
  resolvedAt?: string | Date | null;
  existingFeedback?: { rating: number; comment?: string | null } | null;
}

export function ClosureFeedbackPanel({
  ticketId,
  status,
  resolvedAt,
  existingFeedback,
}: ClosureFeedbackPanelProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || "");
  const [reopenReason, setReopenReason] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canReopen = status === TicketStatus.RESOLVED && isWithinReopenWindow(resolvedAt);

  // 1. Confirm Resolution & Close
  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to confirm resolution");
        setIsLoading(false);
        return;
      }

      toastSuccess("Thank you! Ticket verified and closed.");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  // 2. Reopen Ticket within 3-day window
  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      toastError("Please provide a reason explaining why the issue is not resolved.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to reopen ticket");
        setIsLoading(false);
        return;
      }

      toastSuccess("Ticket reopened and sent back to dispatch queue.");
      setShowReopenModal(false);
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  // 3. Submit/Update Feedback for CLOSED ticket
  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to submit feedback");
        setIsLoading(false);
        return;
      }

      toastSuccess("Feedback rating saved!");
      router.refresh();
    } catch {
      toastError("Network error");
      setIsLoading(false);
    }
  };

  if (status !== TicketStatus.RESOLVED && status !== TicketStatus.CLOSED) {
    return null;
  }

  return (
    <div className="bg-canvas border border-borderline rounded-lg p-5 space-y-5 shadow-sm">
      {status === TicketStatus.RESOLVED && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-semantic-green flex-shrink-0" />
            <h4 className="font-bold text-sm">
              Work Completed by Technician: Please Verify & Confirm
            </h4>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Please inspect the repairs. If satisfied, confirm closure below and rate the maintenance quality.
            If the problem persists, you may reopen this ticket within 3 days.
          </p>
        </div>
      )}

      {/* Confirmation & Rating Form */}
      <form onSubmit={status === TicketStatus.RESOLVED ? handleConfirmClose : handleUpdateFeedback} className="space-y-4">
        {/* Star Rating Picker */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-navy uppercase tracking-wider">
            Rate Facilities Service Quality (1 to 5 Stars)
          </label>
          <div className="flex items-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`w-7 h-7 ${
                    (hoverRating || rating) >= star
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-navy ml-2">
              {rating === 5
                ? "Excellent (5/5)"
                : rating === 4
                ? "Good (4/5)"
                : rating === 3
                ? "Average (3/5)"
                : rating === 2
                ? "Poor (2/5)"
                : "Unsatisfactory (1/5)"}
            </span>
          </div>
        </div>

        {/* Comment field */}
        <Textarea
          label="Feedback or Comments (Optional)"
          placeholder="Share your thoughts on timeliness, cleanliness, or repair quality..."
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {status === TicketStatus.RESOLVED ? (
            <>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="bg-semantic-green hover:bg-green-700"
                isLoading={isLoading}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Confirm Resolution & Close Ticket
              </Button>

              {canReopen ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowReopenModal(true)}
                  className="text-semantic-red border-red-200 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reopen Issue (Within 3 Days)
                </Button>
              ) : (
                <span className="text-xs text-muted italic">
                  3-day reopen window has expired.
                </span>
              )}
            </>
          ) : (
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              Update Rating
            </Button>
          )}
        </div>
      </form>

      {/* Modal: Reopen Reason */}
      {showReopenModal && (
        <div className="p-4 rounded-lg bg-red-50 border border-semantic-red/40 space-y-3">
          <div className="flex items-center gap-2 text-semantic-red font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>State Reason for Reopening Ticket</span>
          </div>

          <Textarea
            placeholder="Explain what was not fixed or what problem reoccurred..."
            rows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleReopen}
              isLoading={isLoading}
            >
              Confirm Reopen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowReopenModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
