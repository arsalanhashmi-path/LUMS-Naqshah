import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Box, X } from "lucide-react";

export default function ControlsPanel({
  isMobile,
  isDarkMode,
  currentLevel,
  setCurrentLevel,
  mapRef,
  onClose,
}) {
  const levels = isMobile ? [2, 1, 0, -1] : [3, 2, 1, 0, -1, -2];

  return (
    <Card
      className={`${isDarkMode ? "glass-panel-dark" : "glass-panel"} ${!isMobile && "p-3.5"}`}
    >
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
            className="flex-1 md:flex-none"
          >
            <Compass className="h-5 w-5" />
            {isMobile && <span className="ml-2">2D North</span>}
            {!isMobile && <span className="sr-only">2D North</span>}
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
            className="flex-1 md:flex-none"
          >
            <Box className="h-5 w-5" />
            {isMobile && <span className="ml-2">3D View</span>}
            {!isMobile && <span className="sr-only">3D View</span>}
          </Button>
        </div>

        {/* Level Selector */}
        <div>
          <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2">
            {isMobile ? "Indoor Levels" : "Levels"}
          </h4>
          <div
            className={`grid gap-1.5 ${isMobile ? "grid-cols-4" : "flex flex-col"}`}
          >
            {levels.map((level) => (
              <Button
                key={level}
                variant={currentLevel === level ? "default" : "glass"}
                size={isMobile ? "default" : "sm"}
                onClick={() => setCurrentLevel(level)}
                className={`${!isMobile && "justify-start"} ${
                  currentLevel === level ? "font-bold" : "font-medium"
                }`}
              >
                {isMobile
                  ? level === 0
                    ? "G"
                    : level
                  : level === 0
                    ? "Ground"
                    : `Level ${level}`}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
