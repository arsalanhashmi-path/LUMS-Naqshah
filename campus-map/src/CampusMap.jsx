import React, { useRef, useState, useEffect } from "react";
import { Settings, Compass } from "lucide-react";
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
        setActivePanel("building");
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
    boxShadow: theme.shadow,
    transition: "all 0.2s",
  };

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
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

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
        mapRef={mapRef}
        lumsLogo={lumsLogo}
      />

      {/* PANELS */}
      <div
        className={`absolute ${isMobile ? "bottom-0 left-0 right-0" : "top-[80px] left-6"} z-10 flex flex-col gap-4 pointer-events-none`}
      >
        {/* Controls Panel (Desktop: Top Left, Mobile: Bottom Sheet/Float) */}
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

        {/* Building Panel */}
        {activePanel === "building" &&
          selectedFeature &&
          !isEditingFloorplan && (
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
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

        {/* Navigation Panel */}
        {(!isMobile ? true : activePanel === "nav") &&
          // On desktop, we might want to hide nav if not needed or always show it?
          // Original code didn't have always-visible nav on desktop, but let's follow the activePanel logic or just show it.
          // Let's stick to activePanel for mobile, but for desktop maybe always show or use a button?
          // The Panels existing code suggests they are cards.
          // Let's assume on Desktop we show it if activePanel is set OR if we want it always available.
          // For now, let's keep it consistent: Desktop shows if activePanel='nav' OR if we decide to show it.
          // Actually, let's make it so Desktop has a way to toggle it, or just show it.
          // The original code had specific layout.
          // Let's check logic: Mobile uses FABs to toggle. Desktop usually has them on screen.
          // Let's assume on Desktop, Navigation is always visible or togglable?
          // Let's make it visible on desktop if it's not conflicting.
          // Actually, let's just use activePanel for both for simplicity,
          // BUT implementation says: "Mobile: FABs".
          // Let's add FABs for desktop too if panels are hidden?
          // Or just render them in a sidebar stack.
          // Let's render ControlsPanel always on Desktop.
          // BuildingPanel when selected.
          // NavigationPanel... maybe we need a button to open it?
          // Or just render it below Controls?
          (activePanel === "nav" ||
            (!isMobile && activePanel !== "building")) && (
            // Logic: On desktop, show Nav unless Building is open (to save space) or show both?
            // Let's show NavPanel.
            <div className="pointer-events-auto mt-4">
              <NavigationPanel
                isMobile={isMobile}
                isDarkMode={isDarkMode}
                navStartId={navStartId}
                setNavStartId={setNavStartId}
                navEndId={navEndId}
                setNavEndId={setNavEndId}
                availableBuildings={availableBuildings}
                startNavigation={startNavigation}
                resetNavigation={resetNavigation}
                routeGeoJSON={routeGeoJSON}
                isNavigating={isNavigating}
                onClose={() => setActivePanel(null)}
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
// But we use maplibregl.Popup/LngLatBounds.
import maplibregl from "maplibre-gl";
