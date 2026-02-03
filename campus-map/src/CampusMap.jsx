import React, { useRef, useState, useEffect } from "react";
import {
  Settings,
  Compass,
  LocateFixed,
  Box,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import FloorplanEditor from "./FloorplanEditor";
import Navbar from "./components/layout/Navbar";
import NavigationPanel from "./components/panels/NavigationPanel";
import BuildingPanel from "./components/panels/BuildingPanel";
import ControlsPanel from "./components/panels/ControlsPanel";
import { useMap } from "./hooks/useMap";
import { useCampusData } from "./hooks/useCampusData";
import { useNavigation } from "./hooks/useNavigation";
import lumsLogo from "./lums-logo.png";
import { themes } from "./theme";

export default function CampusMap() {
  const mapContainer = useRef(null);

  // --- HOOKS ---
  const { mapRef, isMobile, isDarkMode, setIsDarkMode, theme, isMapLoaded } =
    useMap(mapContainer);

  const [showSplash, setShowSplash] = useState(true);

  // Hide splash only after map is loaded
  useEffect(() => {
    if (isMapLoaded) {
      // Small delay for smooth exit (increased as requested)
      const timer = setTimeout(() => setShowSplash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded]);

  const {
    geoJsonData,
    setGeoJsonData,
    selectedBuildingId,
    setSelectedBuildingId,
    selectedFeature,
    availableBuildings,
    updateBuildingLevels,
    updateUndergroundLevels,
    deleteBuilding,
    handleSave,
  } = useCampusData(mapRef);

  const {
    navStartId,
    setNavStartId,
    navEndId,
    setNavEndId,
    routeGeoJSON,
    isNavigating,
    startNavigation,
    resetNavigation,
  } = useNavigation(geoJsonData, mapRef, isMobile);

  // --- LOCAL UI STATE ---
  const [activePanel, setActivePanel] = useState(null); // 'nav', 'building', 'controls'
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isEditingFloorplan, setIsEditingFloorplan] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- EVENT HANDLERS ---

  // Sync map clicks with state
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const onMapClick = (e) => {
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ["3d-buildings"],
      });

      if (!features.length) {
        // Deselect if clicked on empty space
        setSelectedBuildingId(null);
        if (activePanel === "building") setActivePanel(null);
        if (mapRef.current.getLayer("3d-buildings-highlight"))
          mapRef.current.setFilter("3d-buildings-highlight", ["in", "@id", ""]);
        return;
      }
    };

    const onBuildingClick = (e) => {
      if (e.features && e.features[0]) {
        const id = e.features[0].properties["@id"];
        setSelectedBuildingId(id);
        setIsEditingFloorplan(true); // Go directly to floorplan
        mapRef.current.setFilter("3d-buildings-highlight", ["in", "@id", id]);

        // Prevent the map click event from clearing the selection immediately
        // MapLibre events: if we attach to specific layer, it fires.
        // The global click also fires. We might need to stop propagation or just rely on layer click.
      }
    };

    mapRef.current.on("click", "3d-buildings", onBuildingClick);
    mapRef.current.on("click", onMapClick);

    // Hover effects
    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    const onMouseMove = (e) => {
      mapRef.current.getCanvas().style.cursor = "pointer";
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="color:#000;font-weight:bold;padding:8px;border-radius:8px">${e.features[0].properties.name || "Building"}</div>`,
        )
        .addTo(mapRef.current);
    };

    const onMouseLeave = () => {
      mapRef.current.getCanvas().style.cursor = "";
      hoverPopup.remove();
    };

    mapRef.current.on("mousemove", "3d-buildings", onMouseMove);
    mapRef.current.on("mouseleave", "3d-buildings", onMouseLeave);

    return () => {
      if (!mapRef.current) return;
      mapRef.current.off("click", "3d-buildings", onBuildingClick);
      mapRef.current.off("click", onMapClick);
      mapRef.current.off("mousemove", "3d-buildings", onMouseMove);
      mapRef.current.off("mouseleave", "3d-buildings", onMouseLeave);
      hoverPopup.remove();
    };
  }, [isMapLoaded, activePanel]); // Re-bind when map loads

  // Effect to sync indoor filter with currentLevel
  useEffect(() => {
    if (mapRef.current?.getLayer("indoor-rooms")) {
      mapRef.current.setFilter("indoor-rooms", [
        "all",
        ["has", "level"],
        ["==", "level", currentLevel],
      ]);
    }
  }, [currentLevel, isMapLoaded]);

  // --- RENDER HELPERS ---
  const fabStyle = {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    border: "none",
    backgroundColor: theme.surface,
    color: theme.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backgroundColor: theme.backgroundPill,
    color: theme.accent,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const LoadingScreen = () => (
    <div
      className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white splash-container ${!showSplash ? "hidden" : ""}`}
    >
      <img src={lumsLogo} alt="LUMS" className="h-24 w-auto mb-8 splash-logo" />
      <div className="flex gap-1">
        {"Naqshah".split("").map((letter, i) => (
          <span
            key={i}
            className="text-5xl font-black letter-animation"
            style={{
              color: "#1e3a8a",
              animationDelay: `${1.2 + i * 0.1}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );

  // If editing, show editor full screen

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: theme.backgroundSolid,
        overflow: "hidden",
      }}
    >
      <LoadingScreen />
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Only show UI after splash is gone, or use opacity for smooth reveal */}
      <div
        className={`transition-opacity duration-1000 ${showSplash ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <Navbar
          isMobile={isMobile}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isAdminMode={isAdminMode}
          setIsAdminMode={setIsAdminMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchFocused={isSearchFocused}
          setIsSearchFocused={setIsSearchFocused}
          availableBuildings={availableBuildings}
          setSelectedBuildingId={setSelectedBuildingId}
          setActivePanel={setActivePanel}
          setIsEditingFloorplan={setIsEditingFloorplan}
          mapRef={mapRef}
          lumsLogo={lumsLogo}
        />

        {/* Mobile: Top-Right Control Buttons */}
        {isMobile && !isEditingFloorplan && (
          <MobileControlStrip mapRef={mapRef} theme={theme} />
        )}

        {/* PANELS */}
        <div
          className={`absolute ${isMobile ? "bottom-0 left-0 right-0" : "top-[80px] left-4"} z-10 flex flex-col gap-4 pointer-events-none`}
        >
          {/* Controls Panel */}
          {(!isMobile || activePanel === "controls") && (
            <div className="pointer-events-auto">
              <ControlsPanel
                isMobile={isMobile}
                isDarkMode={isDarkMode}
                currentLevel={currentLevel}
                setCurrentLevel={setCurrentLevel}
                mapRef={mapRef}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

          {/* Navigation Panel */}
          {(!isMobile || activePanel === "nav") && (
            <div className="pointer-events-auto">
              <NavigationPanel
                isMobile={isMobile}
                isDarkMode={isDarkMode}
                navStartId={navStartId}
                setNavStartId={setNavStartId}
                navEndId={navEndId}
                setNavEndId={setNavEndId}
                isNavigating={isNavigating}
                startNavigation={startNavigation}
                resetNavigation={resetNavigation}
                routeGeoJSON={routeGeoJSON}
                availableBuildings={availableBuildings}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

          {/* Building Panel */}
          {selectedFeature && (!isMobile || activePanel === "building") && (
            <div className="pointer-events-auto">
              <BuildingPanel
                isMobile={isMobile}
                isDarkMode={isDarkMode}
                selectedFeature={selectedFeature}
                isAdminMode={isAdminMode}
                updateBuildingLevels={updateBuildingLevels}
                updateUndergroundLevels={updateUndergroundLevels}
                handleSave={handleSave}
                deleteBuilding={deleteBuilding}
                setIsEditingFloorplan={setIsEditingFloorplan}
                onClose={() => {
                  setSelectedBuildingId(null);
                  if (activePanel === "building") setActivePanel(null);
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile: Floating Action Buttons */}
        {isMobile && !activePanel && !isEditingFloorplan && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              right: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              zIndex: 40,
            }}
          >
            <button onClick={() => setActivePanel("controls")} style={fabStyle}>
              <Settings size={24} />
            </button>
            <button
              onClick={() => setActivePanel("nav")}
              style={{
                ...fabStyle,
                backgroundColor: theme.accentSecondary,
                color: "#fff",
              }}
            >
              <Compass size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Floorplan Editor */}
      {isEditingFloorplan && selectedFeature && (
        <FloorplanEditor
          building={selectedFeature}
          geoJsonData={geoJsonData}
          setGeoJsonData={setGeoJsonData}
          mapRef={mapRef}
          onClose={() => setIsEditingFloorplan(false)}
          onSave={handleSave}
          theme={theme}
          isMobile={isMobile}
          isAdminMode={isAdminMode}
        />
      )}
    </div>
  );
}

// Mobile control strip component - floating buttons at top-right
function MobileControlStrip({ mapRef, theme }) {
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

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        const el = document.createElement("div");
        el.className = "user-location-marker";
        el.innerHTML = `
          <div class="pulse-ring"></div>
          <div class="pulse-core"></div>
        `;

        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);

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
        alert("Could not get your location. Please check permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const buttonStyle = {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "none",
    backgroundColor: "#ffffff",
    color: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 40,
      }}
    >
      <button
        onClick={() =>
          mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 1000 })
        }
        style={buttonStyle}
        title="Reset North"
      >
        <Compass size={20} />
      </button>
      <button
        onClick={() =>
          mapRef.current?.easeTo({ pitch: 60, bearing: -20, duration: 1000 })
        }
        style={buttonStyle}
        title="3D View"
      >
        <Box size={20} />
      </button>
      <button
        onClick={handleLocateMe}
        disabled={isLocating}
        style={{ ...buttonStyle, opacity: isLocating ? 0.6 : 1 }}
        title="My Location"
      >
        {isLocating ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <LocateFixed size={20} />
        )}
      </button>
      <button
        onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
        style={buttonStyle}
        title="Zoom In"
      >
        <Plus size={20} />
      </button>
      <button
        onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
        style={buttonStyle}
        title="Zoom Out"
      >
        <Minus size={20} />
      </button>
    </div>
  );
}
