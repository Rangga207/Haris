"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import { STRINGS } from "@/lib/constants/strings";
import { cn } from "./button";

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  error?: string;
}

export function FileDropzone({ onFileSelect, error }: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      onFileSelect(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must not exceed 5 MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      alert("Only JPG and PNG images are allowed");
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-navy">
        {STRINGS.requestForm.photoLabel}
      </label>

      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white hover:bg-slate-50",
            isDragging ? "border-sky bg-ice/10" : "border-borderline",
            error && "border-semantic-red"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <UploadCloud className="w-10 h-10 text-blue mb-2" />
          <p className="text-sm font-medium text-navy">
            {STRINGS.requestForm.dropzoneDrag}
          </p>
          <p className="text-xs text-muted mt-1">{STRINGS.requestForm.photoHint}</p>
        </div>
      ) : (
        <div className="relative border border-borderline rounded-lg p-3 bg-white flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-20 h-20 object-cover rounded border border-borderline"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy truncate">
              {selectedFile?.name}
            </p>
            <p className="text-xs text-muted">
              {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-blue hover:underline mt-1 block"
            >
              {STRINGS.requestForm.dropzoneChange}
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleFile(null)}
            className="p-1.5 text-muted hover:text-semantic-red hover:bg-red-50 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {error && <p className="text-xs font-medium text-semantic-red">{error}</p>}
    </div>
  );
}
