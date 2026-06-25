"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface LocationButtonProps {
  onLocated: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationButton({ onLocated }: LocationButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  function handleClick() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setMessage("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setStatus("loading");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocated({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setStatus("ok");
        setMessage("Ubicación capturada.");
      },
      (err) => {
        setStatus("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado."
            : "No se pudo obtener la ubicación."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={status === "loading"}
      >
        📍 {status === "loading" ? "Obteniendo ubicación…" : "Usar mi ubicación"}
      </Button>
      {message && (
        <p
          className={
            status === "error"
              ? "text-xs font-medium text-emergency"
              : "text-xs font-medium text-safe"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
