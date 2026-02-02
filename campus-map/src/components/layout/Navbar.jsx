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

  return (
    <header className="absolute top-0 left-0 right-0 h-[60px] md:h-[70px] bg-white flex items-center justify-between px-4 md:px-6 shadow-lg z-[100]">
      {/* Logo & Title */}
      <div className="flex items-center gap-2.5 md:gap-3.5">
        <img src={lumsLogo} alt="LUMS" className="h-10 md:h-[50px] w-auto" />
        <h1
          className="m-0 text-2xl md:text-[32px] font-extrabold tracking-tight"
          style={{
            color: LUMS_BLUE,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Naqshah
        </h1>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-[400px] mx-5">
        <div
          className={`flex items-center bg-slate-100 dark:bg-white/10 rounded-xl px-4 py-2 border transition-all ${
            isSearchFocused
              ? "border-primary ring-1 ring-primary"
              : "border-transparent"
          }`}
        >
          <Search className="h-4 w-4 mr-2 text-muted-foreground" />
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
              className="h-auto p-1 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery && (
          <div className="absolute top-[120%] left-0 right-0 glass-panel overflow-hidden z-[200]">
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
                  className="flex items-center gap-2.5 px-4 py-3 border-b border-border cursor-pointer hover:bg-accent/20 transition-colors"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {b.properties.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Building •{" "}
                      {parseInt(b.properties["building:levels"]) || 1} Floors
                    </div>
                  </div>
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

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant={isAdminMode ? "destructive" : "outline"}
          size={isMobile ? "sm" : "default"}
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`font-semibold ${
            !isAdminMode
              ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              : ""
          }`}
        >
          {isAdminMode ? (
            <>
              <Unlock className="h-4 w-4" />
              {!isMobile && "Admin"}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {!isMobile && "Viewer"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="font-semibold"
          style={{ borderColor: LUMS_BLUE, color: LUMS_BLUE }}
        >
          {isDarkMode ? (
            <>
              <Moon className="h-4 w-4" />
              {!isMobile && "Dark"}
            </>
          ) : (
            <>
              <Sun className="h-4 w-4" />
              {!isMobile && "Light"}
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
