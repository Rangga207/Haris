"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STRINGS } from "@/lib/constants/strings";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ShieldAlert, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { calculateSuggestedPriority } from "@/lib/priority";
import { Priority } from "@prisma/client";

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

export default function NewRequestPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSafetyHazard, setIsSafetyHazard] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch initial buildings and categories
  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch("/api/buildings"),
          fetch("/api/categories"),
        ]);
        const bData = await bRes.json();
        const cData = await cRes.json();
        if (bData.buildings) setBuildings(bData.buildings);
        if (cData.categories) setCategories(cData.categories);
      } catch {
        toastError("Failed to load campus locations and categories");
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Cascade load rooms when building selection changes
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
        if (data.rooms) {
          setRooms(data.rooms);
        }
      } catch {
        toastError("Failed to load rooms for selected building");
      } finally {
        setIsLoadingRooms(false);
      }
    }
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding]);

  // Compute suggested priority dynamically
  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);
  const suggestedPriority = activeCategoryObj
    ? calculateSuggestedPriority(activeCategoryObj.name, isSafetyHazard)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedBuilding) newErrors.building = "Please select a building";
    if (!selectedRoom) newErrors.room = "Please select a room";
    if (!selectedCategory) newErrors.category = "Please select a category";
    if (!description.trim() || description.trim().length < 5) {
      newErrors.description = "Description must be at least 5 characters long";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("buildingId", selectedBuilding);
      formData.append("roomId", selectedRoom);
      formData.append("categoryId", selectedCategory);
      formData.append("description", description.trim());
      formData.append("isSafetyHazard", String(isSafetyHazard));
      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.message || "Failed to submit ticket.");
        setIsSubmitting(false);
        return;
      }

      toastSuccess("Complaint submitted successfully!");
      router.push(`/requests/new/success?ticket=${data.ticket.ticketNo}`);
    } catch (err) {
      toastError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{STRINGS.common.back} to My Requests</span>
        </Link>
      </div>

      {/* Emergency Notice Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-semantic-red/30 text-semantic-red shadow-sm">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <span className="font-bold">Urgent Notice: </span>
          <span>{STRINGS.app.emergencyNotice}</span>
          <span className="font-extrabold underline ml-1">
            {process.env.NEXT_PUBLIC_EMERGENCY_PHONE || "+62 21 555-0911"}
          </span>
          <p className="text-xs text-red-700 mt-0.5">
            CampusFix tickets are processed during regular facilities operating hours.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-borderline shadow-md">
        <CardHeader>
          <CardTitle>{STRINGS.requestForm.title}</CardTitle>
          <CardDescription>{STRINGS.requestForm.subtitle}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Building and Room (Cascading) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={STRINGS.requestForm.buildingLabel}
                value={selectedBuilding}
                onChange={(e) => {
                  setSelectedBuilding(e.target.value);
                  setErrors((prev) => ({ ...prev, building: "" }));
                }}
                error={errors.building}
                required
              >
                <option value="">{STRINGS.requestForm.buildingPlaceholder}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </Select>

              <Select
                label={STRINGS.requestForm.roomLabel}
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  setErrors((prev) => ({ ...prev, room: "" }));
                }}
                disabled={!selectedBuilding || isLoadingRooms}
                error={errors.room}
                hint={
                  !selectedBuilding
                    ? STRINGS.requestForm.roomSelectBuildingFirst
                    : isLoadingRooms
                    ? "Loading rooms..."
                    : undefined
                }
                required
              >
                <option value="">
                  {!selectedBuilding
                    ? STRINGS.requestForm.roomSelectBuildingFirst
                    : STRINGS.requestForm.roomPlaceholder}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.floor ? `(${r.floor})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {/* Category */}
            <div>
              <Select
                label={STRINGS.requestForm.categoryLabel}
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setErrors((prev) => ({ ...prev, category: "" }));
                }}
                error={errors.category}
                required
              >
                <option value="">{STRINGS.requestForm.categoryPlaceholder}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              {/* Suggested Priority Hint */}
              {suggestedPriority && (
                <div className="mt-2 flex items-center gap-2 p-2.5 rounded-md bg-ice/25 border border-ice text-xs text-navy">
                  <span className="font-semibold">
                    {STRINGS.priority.suggestedLabel}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      suggestedPriority === Priority.CRITICAL
                        ? "bg-red-100 text-red-800"
                        : suggestedPriority === Priority.HIGH
                        ? "bg-orange-100 text-orange-900"
                        : suggestedPriority === Priority.MEDIUM
                        ? "bg-amber-100 text-amber-900"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {STRINGS.priority[suggestedPriority]}
                  </span>
                  <span className="text-muted ml-auto">
                    Based on facilities SLA guidelines
                  </span>
                </div>
              )}
            </div>

            {/* Safety Hazard Checkbox */}
            <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 space-y-1">
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
                    {STRINGS.requestForm.safetyHazardLabel}
                  </span>
                  <p className="text-muted mt-0.5">
                    {STRINGS.requestForm.safetyHazardHint}
                  </p>
                </div>
              </label>
            </div>

            {/* Description */}
            <Textarea
              label={STRINGS.requestForm.descriptionLabel}
              placeholder={STRINGS.requestForm.descriptionPlaceholder}
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((prev) => ({ ...prev, description: "" }));
              }}
              error={errors.description}
              required
            />

            {/* File Dropzone */}
            <FileDropzone onFileSelect={(file) => setPhotoFile(file)} />

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-semibold"
                isLoading={isSubmitting}
              >
                {isSubmitting
                  ? STRINGS.requestForm.submitting
                  : STRINGS.requestForm.submitButton}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
