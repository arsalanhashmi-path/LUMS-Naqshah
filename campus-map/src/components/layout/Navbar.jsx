import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Building2, Lock, Unlock, Moon, Sun } from "lucide-react";

const LUMS_BLUE = "#1e3a8a";

export default function Navbar({
  isMobile,
  isDarkMode,
  setIsDarkMode,
  isAdminMode,
  setIsAdminMode,
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  availableBuildings,
  setSelectedBuildingId,
  setActivePanel,
  mapRef,
  lumsLogo,
}) {
  const filteredBuildings = availableBuildings.filter((b) =>
    b.properties.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const pillStyle = "bg-white border border-gray-200 shadow-lg rounded-xl";
  const pillHeight = "h-12";

  return (
    <header className="absolute top-4 left-4 right-4 flex items-center z-[100] pointer-events-none gap-3">
      {/* Logo & Title - Floating Pill */}
      <div
        className={`flex items-center gap-2 px-3 md:px-4 ${pillHeight} ${pillStyle} pointer-events-auto shrink-0`}
      >
        <img src={lumsLogo} alt="LUMS" className="h-7 md:h-8 w-auto" />
        <h1
          className="m-0 text-base md:text-xl font-extrabold tracking-tight"
          style={{
            color: LUMS_BLUE,
            fontFamily: "'Inter', system-ui, sans-serif",
            WebkitTextStroke: "1px white",
            paintOrder: "stroke fill",
          }}
        >
          Naqshah
        </h1>
      </div>

      {/* Search Bar - Centered, Fills Available Space */}
      <div className="relative flex-1 pointer-events-auto">
        <div
          className={`flex items-center px-4 ${pillHeight} ${pillStyle} transition-all ${
            isSearchFocused ? "ring-2 ring-primary/50" : ""
          }`}
        >
          <Search className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Search buildings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="border-none bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 text-sm font-medium placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="h-auto p-1 hover:bg-transparent shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery && (
          <div
            className={`absolute top-[120%] left-0 right-0 ${pillStyle} overflow-hidden z-[200]`}
          >
            <ScrollArea className="max-h-[300px]">
              {filteredBuildings.slice(0, 10).map((b) => (
                <div
                  key={b.properties["@id"]}
                  onClick={() => {
                    setSelectedBuildingId(b.properties["@id"]);
                    setActivePanel("building");
                    const centroid = b.geometry.coordinates[0][0];
                    mapRef.current?.easeTo({
                      center: centroid,
                      zoom: 18,
                      pitch: 45,
                      duration: 1000,
                    });
                    setSearchQuery("");
                    setIsSearchFocused(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm text-foreground">
                    {b.properties.name}
                  </span>
                </div>
              ))}
              {filteredBuildings.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No buildings found
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Right Controls - Floating Pill */}
      <div
        className={`flex items-center gap-2 px-3 ${pillHeight} ${pillStyle} pointer-events-auto shrink-0`}
      >
        <button
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            isAdminMode
              ? "bg-red-500/20 text-red-600 hover:bg-red-500/30"
              : "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
          }`}
        >
          {isAdminMode ? (
            <Unlock className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {!isMobile && (isAdminMode ? "Admin" : "Viewer")}
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-100"
          style={{ color: LUMS_BLUE }}
        >
          {isDarkMode ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {!isMobile && (isDarkMode ? "Dark" : "Light")}
        </button>
      </div>
    </header>
  );
}
