import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation, X, Check, Search } from "lucide-react";

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
  const [startSearch, setStartSearch] = useState("");
  const [endSearch, setEndSearch] = useState("");

  const filteredStart = availableBuildings.filter((b) =>
    b.properties.name.toLowerCase().includes(startSearch.toLowerCase()),
  );

  const filteredEnd = availableBuildings.filter((b) =>
    b.properties.name.toLowerCase().includes(endSearch.toLowerCase()),
  );

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
            <div className="p-2 sticky top-0 bg-background z-10 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search buildings..."
                  className="pl-8 h-8 text-xs"
                  value={startSearch}
                  onChange={(e) => setStartSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ScrollArea className="h-[200px]">
              {filteredStart.map((f) => (
                <SelectItem
                  key={`s_${f.properties["@id"]}`}
                  value={f.properties["@id"]}
                >
                  {f.properties.name}
                </SelectItem>
              ))}
              {filteredStart.length === 0 && (
                <div className="p-2 text-xs text-center text-muted-foreground">
                  No matches
                </div>
              )}
            </ScrollArea>
          </SelectContent>
        </Select>

        <Select value={navEndId} onValueChange={setNavEndId}>
          <SelectTrigger className="w-full bg-card/50 border-border">
            <SelectValue placeholder="To..." />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 sticky top-0 bg-background z-10 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search buildings..."
                  className="pl-8 h-8 text-xs"
                  value={endSearch}
                  onChange={(e) => setEndSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ScrollArea className="h-[200px]">
              {filteredEnd.map((f) => (
                <SelectItem
                  key={`e_${f.properties["@id"]}`}
                  value={f.properties["@id"]}
                >
                  {f.properties.name}
                </SelectItem>
              ))}
              {filteredEnd.length === 0 && (
                <div className="p-2 text-xs text-center text-muted-foreground">
                  No matches
                </div>
              )}
            </ScrollArea>
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

        {routeGeoJSON && routeGeoJSON.properties && (
          <div className="flex items-center gap-2 p-3 bg-pink-500/20 rounded-xl text-pink-400 text-xs text-wrap whitespace-normal">
            <Check className="h-4 w-4 shrink-0" />
            <span className="break-words">
              {routeGeoJSON.properties?.from} → {routeGeoJSON.properties?.to}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
