"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Role, Channel, Priority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, PlusCircle, AlertTriangle } from "lucide-react";
import { calculateSuggestedPriority } from "@/lib/priority";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface Building {
  id: string;
  code: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  floor: string | null;
}

interface Category {
  id: string;
  name: string;
  defaultPriority: Priority;
}

export default function CreateOnBehalfPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [reporterMode, setReporterMode] = useState<"existing" | "manual">("existing");
  const [selectedReporterId, setSelectedReporterId] = useState("");
  const [manualReporterName, setManualReporterName] = useState("");
  const [manualReporterPhone, setManualReporterPhone] = useState("");
  const [channel, setChannel] = useState<Channel>(Channel.WALK_IN);

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSafetyHazard, setIsSafetyHazard] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [bRes, cRes, meRes] = await Promise.all([
          fetch("/api/buildings"),
          fetch("/api/categories"),
          fetch("/api/auth/me"),
        ]);
        const bData = await bRes.json();
        const cData = await cRes.json();
        const meData = await meRes.json();

        if (bData.buildings) setBuildings(bData.buildings);
        if (cData.categories) setCategories(cData.categories);

        // Load reporter users
        const uRes = await fetch("/api/users");
        if (uRes.ok) {
          const uData = await uRes.json();
          if (uData.users) setUsers(uData.users);
        }
      } catch {
        toastError("Failed to initialize master data");
      }
    }
    loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cascade rooms
  useEffect(() => {
    if (!selectedBuilding) {
      setRooms([]);
      setSelectedRoom("");
      return;
    }

    async function loadRooms() {
      setIsLoadingRooms(true);
      try {
        const res = await fetch(`/api/buildings/${selectedBuilding}/rooms`);
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
      } catch {
        toastError("Failed to load rooms for building");
      } finally {
        setIsLoadingRooms(false);
      }
    }
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding]);

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const suggestedPriority = activeCategory
    ? calculateSuggestedPriority(activeCategory.name, isSafetyHazard)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuilding || !selectedRoom || !selectedCategory || !description.trim()) {
      toastError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("buildingId", selectedBuilding);
      formData.append("roomId", selectedRoom);
      formData.append("categoryId", selectedCategory);
      formData.append("description", description.trim());
      formData.append("isSafetyHazard", String(isSafetyHazard));
      formData.append("channel", channel);

      if (reporterMode === "existing" && selectedReporterId) {
        formData.append("reporterId", selectedReporterId);
      } else if (reporterMode === "manual") {
        if (manualReporterName) formData.append("reporterName", manualReporterName);
        if (manualReporterPhone) formData.append("reporterPhone", manualReporterPhone);
      }

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.message || "Failed to create ticket");
        setIsSubmitting(false);
        return;
      }

      toastSuccess(`Ticket ${data.ticket.ticketNo} created successfully!`);
      router.push(`/tickets/${data.ticket.id}`);
    } catch {
      toastError("Network error while submitting ticket");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas py-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ticket Inbox</span>
        </Link>
      </div>

      <Card className="border-borderline shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue" />
            Create Facility Ticket on Behalf
          </CardTitle>
          <p className="text-xs text-muted">
            Log facility reports received via walk-in visitors, telephone calls, or WhatsApp messages.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Reporting Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Intake Channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                required
              >
                <option value={Channel.WALK_IN}>Walk-in Counter</option>
                <option value={Channel.WHATSAPP}>WhatsApp Facility Hotline</option>
                <option value={Channel.PHONE}>Telephone Call</option>
                <option value={Channel.WEB}>Web Portal</option>
              </Select>

              {/* Reporter Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Reporter Identification
                </label>
                <div className="flex rounded-md border border-borderline p-1 bg-canvas text-xs">
                  <button
                    type="button"
                    onClick={() => setReporterMode("existing")}
                    className={`flex-1 py-1.5 rounded font-medium transition-colors ${
                      reporterMode === "existing"
                        ? "bg-blue text-white"
                        : "text-navy hover:bg-slate-200"
                    }`}
                  >
                    Select User
                  </button>
                  <button
                    type="button"
                    onClick={() => setReporterMode("manual")}
                    className={`flex-1 py-1.5 rounded font-medium transition-colors ${
                      reporterMode === "manual"
                        ? "bg-blue text-white"
                        : "text-navy hover:bg-slate-200"
                    }`}
                  >
                    Manual Name / Phone
                  </button>
                </div>
              </div>
            </div>

            {/* Reporter details */}
            {reporterMode === "existing" ? (
              <Select
                label="Registered Reporter Account"
                value={selectedReporterId}
                onChange={(e) => setSelectedReporterId(e.target.value)}
              >
                <option value="">Select campus user (student / lecturer / staff)...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Reporter Name"
                  placeholder="e.g. Budi Santoso"
                  value={manualReporterName}
                  onChange={(e) => setManualReporterName(e.target.value)}
                />
                <Input
                  label="Reporter Phone / WhatsApp"
                  placeholder="e.g. +62 812 3456 7890"
                  value={manualReporterPhone}
                  onChange={(e) => setManualReporterPhone(e.target.value)}
                />
              </div>
            )}

            {/* Building & Cascading Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Campus Building"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
              >
                <option value="">Select building...</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Room / Specific Area"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                disabled={!selectedBuilding || isLoadingRooms}
                required
              >
                <option value="">
                  {!selectedBuilding ? "Select a building first" : "Choose room..."}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.floor ? `(${r.floor})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {/* Category & Suggested Priority */}
            <div>
              <Select
                label="Issue Category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Select issue category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              {suggestedPriority && (
                <div className="mt-2 p-2.5 rounded-md bg-ice/25 border border-ice text-xs text-navy flex items-center justify-between">
                  <span>
                    Suggested Priority:{" "}
                    <strong className="text-blue">{suggestedPriority}</strong>
                  </span>
                  <span className="text-muted text-[11px]">
                    Pre-calculated based on facilities policy
                  </span>
                </div>
              )}
            </div>

            {/* Safety Hazard Checkbox */}
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/70">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSafetyHazard}
                  onChange={(e) => setIsSafetyHazard(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-sky"
                />
                <div className="text-xs">
                  <span className="font-semibold text-navy flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 inline" />
                    Mark as Urgent Safety Hazard (Escalates Priority to CRITICAL)
                  </span>
                </div>
              </label>
            </div>

            {/* Description */}
            <Textarea
              label="Detailed Problem Description"
              placeholder="Describe the complaint reported by the user..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            {/* Photo dropzone */}
            <FileDropzone onFileSelect={(file) => setPhotoFile(file)} />

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-sm font-semibold"
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Creating ticket..." : "Create Ticket & Open Triage"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
