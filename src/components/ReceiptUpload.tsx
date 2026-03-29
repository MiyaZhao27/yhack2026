"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, ScanLine, Upload } from "lucide-react";

import { useCameraCapture } from "../hooks/useCameraCapture";
import { api } from "../lib/api/client";
import { NormalizedReceipt } from "../lib/ocr/normalizeReceipt";

interface ScanReceiptResponse {
  receipt: NormalizedReceipt;
}

interface Props {
  onScanned: (receipt: NormalizedReceipt) => void;
}

export function ReceiptUpload({ onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { cameraActive, cameraError, isSupported, startCamera, stopCamera, capturePhoto } =
    useCameraCapture(videoRef);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const helperText = useMemo(() => {
    if (error) return error;
    if (cameraError) return cameraError;
    if (success) return success;
    return "Upload an image or use your camera, then scan to prefill the expense.";
  }, [cameraError, error, success]);

  const resetSelection = () => {
    stopCamera();
    setSelectedFile(null);
    setError("");
    setSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");
    setSuccess("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setError("Please choose a valid image file.");
      return;
    }

    stopCamera();
    setSelectedFile(file);
  };

  const handleCapture = async () => {
    try {
      const captured = await capturePhoto();
      setSelectedFile(captured);
      setError("");
      setSuccess("");
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Could not capture the receipt image."
      );
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError("Select or capture a receipt image first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await api.postForm<ScanReceiptResponse>("/scan-receipt", formData);
      onScanned(response.receipt);
      setSuccess("Receipt scanned. Review the prefilled fields before saving.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Receipt scan failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[rgba(108,73,118,0.2)] bg-white/60 p-4">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="button-secondary text-sm"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={15} /> Upload Receipt
        </button>
        <button
          className="button-secondary text-sm"
          type="button"
          onClick={() => (cameraActive ? stopCamera() : void startCamera())}
        >
          <Camera size={15} /> {cameraActive ? "Close Camera" : "Scan Receipt"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className={cameraActive ? "space-y-3" : "hidden"}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="min-h-64 w-full rounded-2xl bg-[#2a1738] object-cover"
        />
        <div className="flex gap-2">
          <button className="button-primary text-sm" type="button" onClick={handleCapture}>
            <Camera size={15} /> Capture Photo
          </button>
          <button className="button-secondary text-sm" type="button" onClick={stopCamera}>
            Cancel
          </button>
        </div>
      </div>

      {previewUrl ? (
        <div className="space-y-3">
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="w-full rounded-2xl border border-[rgba(108,73,118,0.2)] bg-white object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button className="button-primary text-sm" type="button" onClick={handleScan} disabled={submitting}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <ScanLine size={15} />}
              {submitting ? "Scanning..." : "Scan Receipt"}
            </button>
            <button className="button-secondary text-sm" type="button" onClick={resetSelection}>
              <RefreshCw size={15} /> Retake
            </button>
          </div>
        </div>
      ) : null}

      <p className={`text-xs ${error || cameraError ? "text-[#8f1d3a]" : success ? "text-[#00503a]" : "text-muted"}`}>
        {helperText}
        {!isSupported && !cameraError ? " Camera capture is unavailable here, so use image upload." : ""}
      </p>
    </div>
  );
}
