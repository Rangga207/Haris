"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticketId?: string | null;
  ticket?: {
    id: string;
    ticketNo: string;
    status: string;
  } | null;
}

export default function NotificationsPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      toastError("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toastError("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toastSuccess("All notifications marked as read");
      }
    } catch {
      toastError("Failed to mark all as read");
    }
  };

  return (
    <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue" />
            Notifications
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time updates regarding status transitions, assignments, and priority changes.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-blue" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      <Card className="border-borderline shadow-sm overflow-hidden">
        <CardContent className="p-0 divide-y divide-borderline">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Inbox className="w-10 h-10 text-muted mx-auto" />
              <p className="text-sm font-semibold text-navy">No notifications yet</p>
              <p className="text-xs text-muted">
                You will be notified whenever your tickets are triaged, assigned, or updated.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  n.isRead ? "bg-white" : "bg-ice/15 hover:bg-ice/25"
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue flex-shrink-0" />
                    )}
                    <p
                      className={`text-xs ${
                        n.isRead ? "text-body font-normal" : "text-navy font-semibold"
                      }`}
                    >
                      {n.message}
                    </p>
                  </div>

                  <span className="text-[11px] text-muted block pl-4">
                    {format(new Date(n.createdAt), "MMM d, yyyy HH:mm")}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.ticketId && (
                    <Link
                      href={`/requests/${n.ticketId}`}
                      className="p-1.5 rounded text-blue hover:bg-slate-100"
                      title="View Ticket"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-navy px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
