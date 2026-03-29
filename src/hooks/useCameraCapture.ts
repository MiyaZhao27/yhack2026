"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

function getCameraErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to access the camera. You can upload an image instead.";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Camera permission was denied. You can upload an image instead.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera was found on this device. Upload an image instead.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "The camera is unavailable right now. Try again or upload an image.";
  }

  if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
    return "This camera configuration is not supported on this device.";
  }

  return "Unable to access the camera. You can upload an image instead.";
}

function logCameraError(error: unknown) {
  if (error instanceof Error) {
    console.error("Camera access error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  console.error("Camera access error:", error);
}

async function getCameraStream() {
  const preferredConstraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError")
    ) {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    throw error;
  }
}

async function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;

  const tryPlay = async () => {
    try {
      await video.play();
    } catch {
      // Some browsers reject the first play attempt until metadata is available.
    }
  };

  await tryPlay();

  if (video.readyState >= 2) {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      window.clearTimeout(timeoutId);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onReady = () => {
      void tryPlay();
      finish();
    };

    const timeoutId = window.setTimeout(finish, 2500);

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
  });
}

export function useCameraCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    if (!isSupported) {
      setCameraError("This browser does not support camera capture. Upload an image instead.");
      return false;
    }

    try {
      setCameraError("");
      stopCamera();

      const stream = await getCameraStream();
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Camera preview is not available.");
      }

      await attachStreamToVideo(video, stream);
      setCameraActive(true);
      return true;
    } catch (error) {
      logCameraError(error);
      setCameraError(getCameraErrorMessage(error));
      stopCamera();
      return false;
    }
  }, [isSupported, stopCamera, videoRef]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Camera preview is not ready.");
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("Camera preview is still loading. Please try again.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Camera capture is unavailable in this browser.");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      throw new Error("Could not capture the receipt image.");
    }

    stopCamera();
    return new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
  }, [stopCamera, videoRef]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    cameraActive,
    cameraError,
    isSupported,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
