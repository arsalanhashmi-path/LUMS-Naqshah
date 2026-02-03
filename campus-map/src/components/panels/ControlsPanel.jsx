import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Box, X, LocateFixed, Loader2 } from "lucide-react";
import maplibregl from "maplibre-gl";

export default function ControlsPanel({ isMobile, mapRef, onClose }) {
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Remove existing marker if any
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        // Create pulsing marker element
        const el = document.createElement("div");
        el.className = "user-location-marker";
        el.innerHTML = `
          <div class="pulse-ring"></div>
          <div class="pulse-core"></div>
        `;

        // Add marker to map
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);

        // Fly to location
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 18,
          pitch: 45,
          duration: 1500,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert(
              "Location access denied. Please enable location permissions.",
            );
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out.");
            break;
          default:
            alert("An error occurred while getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <Card className={`glass-panel border-0 ${!isMobile && "p-3.5"}`}>
      {isMobile && (
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-primary text-xs uppercase tracking-widest font-bold flex items-center gap-2">
            ⚙️ Controls
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground"
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className={`${!isMobile ? "p-0" : ""} flex flex-col gap-3`}>
        {/* View Controls */}
        <div className="flex gap-2">
          <Button
            variant="glass"
            size={isMobile ? "default" : "icon-lg"}
            onClick={() =>
              mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 1000 })
            }
            className="flex-1"
            title="Reset North"
          >
            <Compass className="h-5 w-5" />
            {isMobile && <span className="ml-2">Reset North</span>}
          </Button>
          <Button
            variant="glass"
            size={isMobile ? "default" : "icon-lg"}
            onClick={() =>
              mapRef.current?.easeTo({
                pitch: 60,
                bearing: -20,
                duration: 1000,
              })
            }
            className="flex-1"
            title="3D View"
          >
            <Box className="h-5 w-5" />
            {isMobile && <span className="ml-2">3D View</span>}
          </Button>
          <Button
            variant="glass"
            size={isMobile ? "default" : "icon-lg"}
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex-1"
            title="My Location"
          >
            {isLocating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5" />
            )}
            {isMobile && (
              <span className="ml-2">
                {isLocating ? "Locating..." : "My Location"}
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
