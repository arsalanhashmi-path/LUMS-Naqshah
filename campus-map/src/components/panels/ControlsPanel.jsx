import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Box, X } from "lucide-react";

export default function ControlsPanel({ isMobile, mapRef, onClose }) {
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
        </div>
      </CardContent>
    </Card>
  );
}
