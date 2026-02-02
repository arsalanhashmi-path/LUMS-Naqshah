import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation, X, Check } from "lucide-react";

export default function NavigationPanel({
  isMobile,
  isDarkMode,
  navStartId,
  setNavStartId,
  navEndId,
  setNavEndId,
  availableBuildings,
  startNavigation,
  resetNavigation,
  routeGeoJSON,
  isNavigating,
  onClose,
}) {
  return (
    <Card className={`glass-panel border-0 ${isMobile ? "p-0" : "w-80"}`}>
      <CardHeader
        className={`${isMobile ? "pb-4" : "pb-2"} flex flex-row items-center justify-between`}
      >
        <CardTitle className="text-primary text-xs uppercase tracking-widest font-bold flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Navigation
        </CardTitle>
        {isMobile && onClose && (
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
      <CardContent className="flex flex-col gap-3">
        <Select value={navStartId} onValueChange={setNavStartId}>
          <SelectTrigger className="w-full bg-card/50 border-border">
            <SelectValue placeholder="From..." />
          </SelectTrigger>
          <SelectContent>
            {availableBuildings.map((f) => (
              <SelectItem
                key={`s_${f.properties["@id"]}`}
                value={f.properties["@id"]}
              >
                {f.properties.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={navEndId} onValueChange={setNavEndId}>
          <SelectTrigger className="w-full bg-card/50 border-border">
            <SelectValue placeholder="To..." />
          </SelectTrigger>
          <SelectContent>
            {availableBuildings.map((f) => (
              <SelectItem
                key={`e_${f.properties["@id"]}`}
                value={f.properties["@id"]}
              >
                {f.properties.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="accent"
            onClick={startNavigation}
            disabled={isNavigating}
            className="flex-1"
          >
            {isNavigating ? (
              "..."
            ) : (
              <>
                <Navigation className="h-4 w-4" />
                GO
              </>
            )}
          </Button>
          <Button variant="glass" size="icon" onClick={resetNavigation}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {routeGeoJSON && (
          <div className="flex items-center gap-2 p-3 bg-pink-500/20 rounded-xl text-pink-400 text-xs">
            <Check className="h-4 w-4" />
            {routeGeoJSON.properties.from} → {routeGeoJSON.properties.to}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
