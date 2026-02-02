import React, { useRef, useEffect, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// import initialCampusData from "./campus.json"; // REMOVED: Fetching from API
import { buildGraph, findRoute } from "./pathfinding";
import FloorplanEditor from "./FloorplanEditor";
import { themes, glassPanel, glassButton, glassInput } from "./theme";
import lumsLogo from "./lums-logo.png";

// LUMS Brand Colors
const LUMS_BLUE = "#1e3a8a";
const LUMS_WHITE = "#ffffff";

export default function CampusMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(0);

  // --- RESPONSIVE STATE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activePanel, setActivePanel] = useState(null); // 'nav', 'building', 'controls'

  // --- THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = isDarkMode ? themes.dark : themes.light;

  // --- MODE STATE ---
  const [isAdminMode, setIsAdminMode] = useState(false); // Default to Viewer Mode

  // --- DATA STATE ---
  const [geoJsonData, setGeoJsonData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  // --- NAVIGATION STATE ---
  const [navStartId, setNavStartId] = useState("");
  const [navEndId, setNavEndId] = useState("");
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // --- FLOORPLAN EDITOR STATE ---
  const [isEditingFloorplan, setIsEditingFloorplan] = useState(false);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- BUILD ROUTING GRAPH (memoized) ---
  const routingGraph = useMemo(() => {
    const graph = buildGraph(geoJsonData.features);
    return graph;
  }, [geoJsonData]);

  const selectedFeature = useMemo(
    () =>
      geoJsonData.features.find(
        (f) => f.properties["@id"] === selectedBuildingId,
      ),
    [geoJsonData, selectedBuildingId],
  );
  const availableBuildings = useMemo(
    () =>
      geoJsonData.features
        .filter(
          (f) =>
            f.properties.name && f.properties["@id"] && f.properties.building,
        )
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
    [geoJsonData],
  );

  const boundaryFeature = useMemo(
    () =>
      geoJsonData.features.find(
        (f) =>
          f.properties.name === "Lahore University of Management Sciences" &&
          (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"),
      ),
    [geoJsonData],
  );
  const maskGeoJSON = useMemo(() => {
    if (boundaryFeature) {
      const campusRing =
        boundaryFeature.geometry.type === "Polygon"
          ? boundaryFeature.geometry.coordinates[0]
          : boundaryFeature.geometry.coordinates[0][0];
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, 90],
              [180, 90],
              [180, -90],
              [-180, -90],
              [-180, 90],
            ],
            campusRing,
          ],
        },
      };
    }
    return null;
  }, [boundaryFeature]);

  // --- ACTIONS ---
  const updateBuildingLevels = (newLevels) => {
    if (!selectedBuildingId) return;
    setGeoJsonData((prev) => ({
      ...prev,
      features: prev.features.map((f) =>
        f.properties["@id"] === selectedBuildingId
          ? {
              ...f,
              properties: {
                ...f.properties,
                "building:levels": newLevels,
                height: newLevels * 3.5,
              },
            }
          : f,
      ),
    }));
  };

  const updateUndergroundLevels = (newCount) => {
    if (!selectedBuildingId) return;
    setGeoJsonData((prev) => ({
      ...prev,
      features: prev.features.map((f) =>
        f.properties["@id"] === selectedBuildingId
          ? {
              ...f,
              properties: {
                ...f.properties,
                "building:levels:underground": newCount,
              },
            }
          : f,
      ),
    }));
  };

  const deleteBuilding = () => {
    if (!selectedBuildingId || !window.confirm("Delete this building?")) return;
    setGeoJsonData((prev) => ({
      ...prev,
      features: prev.features.filter(
        (f) => f.properties["@id"] !== selectedBuildingId,
      ),
    }));
    setSelectedBuildingId(null);
    setActivePanel(null);
    if (map.current)
      map.current.setFilter("3d-buildings-highlight", ["in", "@id", ""]);
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/campus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geoJsonData),
      });
      if (res.ok) {
        alert("✅ Campus data saved to server!");
      } else {
        alert("❌ Failed to save data. Check console.");
        console.error(await res.text());
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error saving data.");
    }
  };

  const startNavigation = () => {
    if (!navStartId || !navEndId)
      return alert("Select both Start and Destination");
    if (navStartId === navEndId) return alert("Must be different locations");
    setIsNavigating(true);
    const startFeature = geoJsonData.features.find(
      (f) => f.properties["@id"] === navStartId,
    );
    const endFeature = geoJsonData.features.find(
      (f) => f.properties["@id"] === navEndId,
    );
    if (!startFeature || !endFeature) {
      setIsNavigating(false);
      return;
    }
    const route = findRoute(startFeature, endFeature, routingGraph);
    if (!route) {
      setIsNavigating(false);
      return alert("No path found");
    }
    setRouteGeoJSON(route);
    setIsNavigating(false);
    if (isMobile) setActivePanel(null);
    if (map.current && route.geometry.coordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      route.geometry.coordinates.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, {
        padding: isMobile ? 60 : 80,
        pitch: 45,
        duration: 1500,
      });
    }
  };

  const resetNavigation = () => {
    setRouteGeoJSON(null);
    setNavStartId("");
    setNavEndId("");
  };

  // --- API FETCH ---
  useEffect(() => {
    fetch("/api/campus")
      .then((res) => res.json())
      .then((data) => {
        setGeoJsonData(data);
        console.log("Loaded campus data from API");
      })
      .catch((err) => {
        console.error("Failed to load campus data:", err);
        alert(
          "⚠️ Failed to load map data. Is the backend server running? (npm start in /backend)",
        );
      });
  }, []);

  // --- EFFECTS ---
  useEffect(() => {
    if (map.current?.getSource("campus-data"))
      map.current.getSource("campus-data").setData(geoJsonData);
  }, [geoJsonData]);
  useEffect(() => {
    if (map.current?.getSource("route-source"))
      map.current
        .getSource("route-source")
        .setData(routeGeoJSON || { type: "FeatureCollection", features: [] });
  }, [routeGeoJSON]);

  useEffect(() => {
    if (map.current?.getSource("world-mask")) {
      const maskData = maskGeoJSON || {
        type: "FeatureCollection",
        features: [],
      };
      map.current.getSource("world-mask").setData(maskData);
    }
  }, [maskGeoJSON]);

  useEffect(() => {
    if (map.current) return;
    const maskData = maskGeoJSON || { type: "FeatureCollection", features: [] };
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-base": {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
          },
          "campus-data": { type: "geojson", data: geoJsonData },
          "world-mask": { type: "geojson", data: maskData },
          "route-source": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm-base",
            minzoom: 0,
            maxzoom: 19,
          },
          {
            id: "mask-layer",
            type: "fill",
            source: "world-mask",
            paint: { "fill-color": "#f8fafc", "fill-opacity": 0.9 },
          },
          {
            id: "boundary-glow",
            type: "line",
            source: "campus-data",
            filter: ["==", "name", "Lahore University of Management Sciences"],
            paint: { "line-color": "#1e3a8a", "line-width": 4, "line-blur": 2 },
          },
          {
            id: "leisure-layer",
            type: "fill",
            source: "campus-data",
            filter: [
              "any",
              ["==", "leisure", "pitch"],
              ["==", "sport", "basketball"],
              ["==", "leisure", "park"],
              ["==", "leisure", "garden"],
            ],
            paint: {
              "fill-color": [
                "match",
                ["get", "sport"],
                "basketball",
                "#f97316", // Orange for basketball
                "tennis",
                "#a3e635", // Green for tennis
                "#22c55e", // Default green for others
              ],
              "fill-opacity": 0.6,
              "fill-outline-color": "#ffffff",
            },
          },
          {
            id: "paths-layer",
            type: "line",
            source: "campus-data",
            filter: ["has", "highway"],
            paint: {
              "line-color": "#1a1a1a",
              "line-width": 3,
            },
          },
          {
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "campus-data",
            filter: [
              "all",
              ["!=", "name", "Lahore University of Management Sciences"],
              [
                "any",
                ["has", "height"],
                ["has", "building:levels"],
                ["==", "building", "yes"],
              ],
            ],
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["to-number", ["get", "building:levels"]], 1],
                1,
                "#3b82f6",
                3,
                "#1e3a8a",
                10,
                "#1e40af",
              ],
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                [
                  "coalesce",
                  ["to-number", ["get", "height"]],
                  ["*", ["to-number", ["get", "building:levels"]], 3.5],
                  5,
                ],
              ],
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.9,
            },
          },
          {
            id: "3d-buildings-highlight",
            type: "line",
            source: "campus-data",
            filter: ["in", "@id", ""],
            paint: { "line-color": "#fff", "line-width": 4 },
          },
          {
            id: "indoor-rooms",
            type: "fill",
            source: "campus-data",
            filter: ["all", ["has", "level"], ["==", "level", 0]],
            paint: {
              "fill-color": "#1e3a8a",
              "fill-opacity": 0.5,
              "fill-outline-color": "#fff",
            },
          },
          {
            id: "route-line-glow",
            type: "line",
            source: "route-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#1e3a8a",
              "line-width": 12,
              "line-blur": 6,
              "line-opacity": 0.6,
            },
          },
          {
            id: "route-line",
            type: "line",
            source: "route-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#fff", "line-width": 3 },
          },
        ],
      },
      center: [74.4098, 31.4705],
      zoom: 17,
      pitch: 60,
      bearing: -20.8,
      maxBounds: [
        [74.39, 31.46],
        [74.43, 31.48],
      ],
    });

    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });
    map.current.on("mousemove", "3d-buildings", (e) => {
      map.current.getCanvas().style.cursor = "pointer";
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="color:#000;font-weight:bold;padding:8px;border-radius:8px">${e.features[0].properties.name || "Building"}</div>`,
        )
        .addTo(map.current);
    });
    map.current.on("mouseleave", "3d-buildings", () => {
      map.current.getCanvas().style.cursor = "";
      hoverPopup.remove();
    });
    map.current.on("click", "3d-buildings", (e) => {
      if (e.features[0]) {
        const id = e.features[0].properties["@id"];
        setSelectedBuildingId(id);
        setActivePanel("building");
        map.current.setFilter("3d-buildings-highlight", ["in", "@id", id]);
      }
    });
    map.current.on("click", (e) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ["3d-buildings"],
      });
      if (!features.length) {
        setSelectedBuildingId(null);
        if (activePanel === "building") setActivePanel(null);
        if (map.current.getLayer("3d-buildings-highlight"))
          map.current.setFilter("3d-buildings-highlight", ["in", "@id", ""]);
      }
    });
  }, []);

  useEffect(() => {
    if (map.current?.getLayer("indoor-rooms"))
      map.current.setFilter("indoor-rooms", [
        "all",
        ["has", "level"],
        ["==", "level", currentLevel],
      ]);
  }, [currentLevel]);

  // --- STYLES ---
  const panelBase = {
    ...glassPanel(theme),
    padding: isMobile ? "16px" : "20px",
  };
  const bottomSheet = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: "24px 24px 0 0",
    maxHeight: "70vh",
    overflowY: "auto",
    zIndex: 50,
    ...glassPanel(theme),
    padding: "20px",
    paddingBottom: "40px",
  };
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

      {/* Branded Navbar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: isMobile ? "60px" : "70px",
          backgroundColor: LUMS_WHITE,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 16px" : "0 24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          zIndex: 100,
        }}
      >
        {/* Logo & Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "10px" : "14px",
          }}
        >
          <img
            src={lumsLogo}
            alt="LUMS"
            style={{
              height: isMobile ? "40px" : "50px",
              width: "auto",
            }}
          />
          <h1
            style={{
              margin: 0,
              color: LUMS_BLUE,
              fontSize: isMobile ? "24px" : "32px",
              fontWeight: 800,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "-1px",
            }}
          >
            Naqshah
          </h1>
        </div>

        {/* Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            style={{
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "12px",
              border: `2px solid ${isAdminMode ? theme.danger : theme.success}`,
              backgroundColor: isAdminMode ? theme.danger : "transparent",
              color: isAdminMode ? "#fff" : theme.success,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: isMobile ? "12px" : "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            {isAdminMode ? "🔓 Admin" : "🔒 Viewer"}
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "12px",
              border: `2px solid ${LUMS_BLUE}`,
              backgroundColor: "transparent",
              color: LUMS_BLUE,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: isMobile ? "12px" : "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isDarkMode ? "🌙" : "☀️"}
            {!isMobile && (isDarkMode ? "Dark" : "Light")}
          </button>
        </div>
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
            ⚙️
          </button>
          <button
            onClick={() => setActivePanel("nav")}
            style={{
              ...fabStyle,
              backgroundColor: theme.accentSecondary,
              color: "#fff",
            }}
          >
            🧭
          </button>
        </div>
      )}

      {/* Mobile: Bottom Sheet - Navigation */}
      {isMobile && activePanel === "nav" && (
        <div style={bottomSheet}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: theme.accent,
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: "700",
              }}
            >
              🗺️ Navigation
            </h3>
            <button
              onClick={() => setActivePanel(null)}
              style={{
                background: "none",
                border: "none",
                color: theme.textMuted,
                fontSize: "28px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <select
              value={navStartId}
              onChange={(e) => setNavStartId(e.target.value)}
              style={{ ...glassInput(theme), width: "100%", padding: "14px" }}
            >
              <option value="">From...</option>
              {availableBuildings.map((f) => (
                <option
                  key={"s_" + f.properties["@id"]}
                  value={f.properties["@id"]}
                >
                  {f.properties.name}
                </option>
              ))}
            </select>
            <select
              value={navEndId}
              onChange={(e) => setNavEndId(e.target.value)}
              style={{ ...glassInput(theme), width: "100%", padding: "14px" }}
            >
              <option value="">To...</option>
              {availableBuildings.map((f) => (
                <option
                  key={"e_" + f.properties["@id"]}
                  value={f.properties["@id"]}
                >
                  {f.properties.name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={startNavigation}
                disabled={isNavigating}
                style={{
                  ...glassButton(theme, "accent"),
                  flex: 1,
                  padding: "16px",
                  backgroundColor: theme.accentSecondary,
                }}
              >
                {isNavigating ? "..." : "GO 🚀"}
              </button>
              <button
                onClick={resetNavigation}
                style={{ ...glassButton(theme, "default"), padding: "16px" }}
              >
                ✕
              </button>
            </div>
            {routeGeoJSON && (
              <div
                style={{
                  padding: "14px",
                  background: `${theme.accentSecondary}22`,
                  borderRadius: "14px",
                  fontSize: "13px",
                  color: theme.accentSecondary,
                }}
              >
                ✓ {routeGeoJSON.properties.from} → {routeGeoJSON.properties.to}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Bottom Sheet - Controls */}
      {isMobile && activePanel === "controls" && (
        <div style={bottomSheet}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: theme.accent,
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: "700",
              }}
            >
              ⚙️ Controls
            </h3>
            <button
              onClick={() => setActivePanel(null)}
              style={{
                background: "none",
                border: "none",
                color: theme.textMuted,
                fontSize: "28px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            <button
              onClick={() =>
                map.current?.easeTo({ bearing: 0, pitch: 0, duration: 800 })
              }
              style={{ ...glassButton(theme, "default"), flex: 1 }}
            >
              🧭 2D North
            </button>
            <button
              onClick={() =>
                map.current?.easeTo({ pitch: 60, bearing: -20, duration: 800 })
              }
              style={{ ...glassButton(theme, "default"), flex: 1 }}
            >
              🏙️ 3D View
            </button>
          </div>
          <h4
            style={{
              margin: "0 0 12px",
              color: theme.textMuted,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Indoor Levels
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
            }}
          >
            {[2, 1, 0, -1].map((level) => (
              <button
                key={level}
                onClick={() => setCurrentLevel(level)}
                style={{
                  padding: "14px",
                  backgroundColor:
                    currentLevel === level ? theme.accent : theme.surface,
                  color: currentLevel === level ? "#000" : theme.text,
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
              >
                {level === 0 ? "G" : level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: Bottom Sheet - Building */}
      {isMobile && activePanel === "building" && selectedFeature && (
        <div style={bottomSheet}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: theme.text,
                fontSize: "18px",
                fontWeight: "700",
              }}
            >
              {selectedFeature.properties.name || "Building"}
            </h3>
            <button
              onClick={() => {
                setActivePanel(null);
                setSelectedBuildingId(null);
                map.current?.setFilter("3d-buildings-highlight", [
                  "in",
                  "@id",
                  "",
                ]);
              }}
              style={{
                background: "none",
                border: "none",
                color: theme.textMuted,
                fontSize: "28px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              background: theme.gradient,
              borderRadius: "16px",
              marginBottom: "16px",
            }}
          >
            {isAdminMode && (
              <button
                onClick={() =>
                  updateBuildingLevels(
                    Math.max(
                      1,
                      (parseInt(
                        selectedFeature.properties["building:levels"],
                      ) || 1) - 1,
                    ),
                  )
                }
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: theme.danger,
                  color: "#fff",
                  fontSize: "24px",
                }}
              >
                −
              </button>
            )}
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "40px",
                  fontWeight: "800",
                  color: theme.text,
                }}
              >
                {parseInt(selectedFeature.properties["building:levels"]) || 1}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "11px",
                  color: theme.textMuted,
                  textTransform: "uppercase",
                }}
              >
                Floors
              </span>
            </div>
            {isAdminMode && (
              <button
                onClick={() =>
                  updateBuildingLevels(
                    (parseInt(selectedFeature.properties["building:levels"]) ||
                      1) + 1,
                  )
                }
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: theme.success,
                  color: "#fff",
                  fontSize: "24px",
                }}
              >
                +
              </button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
            }}
          >
            {isAdminMode && (
              <>
                <button
                  onClick={handleSave}
                  style={{ ...glassButton(theme, "blue"), padding: "14px" }}
                >
                  💾
                </button>
                <button
                  onClick={deleteBuilding}
                  style={{ ...glassButton(theme, "danger"), padding: "14px" }}
                >
                  🗑️
                </button>
              </>
            )}
            <button
              onClick={() => {
                setActivePanel(null);
                setIsEditingFloorplan(true);
              }}
              style={{
                ...glassButton(theme, "purple"),
                padding: "14px",
                gridColumn: isAdminMode ? "auto" : "span 3",
              }}
            >
              {isAdminMode ? "✏️" : "👁️ Floorplan"}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Panels */}
      {!isMobile && (
        <>
          {/* Building Editor */}
          {selectedFeature && !isEditingFloorplan && (
            <div
              style={{
                position: "absolute",
                top: "100px",
                left: "24px",
                width: "300px",
                zIndex: 20,
                ...panelBase,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: theme.text,
                  }}
                >
                  {selectedFeature.properties.name || "Building"}
                </h3>
                <button
                  onClick={() => {
                    setSelectedBuildingId(null);
                    map.current?.setFilter("3d-buildings-highlight", [
                      "in",
                      "@id",
                      "",
                    ]);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.textMuted,
                    cursor: "pointer",
                    fontSize: "24px",
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  background: theme.gradient,
                  padding: "16px",
                  borderRadius: "14px",
                  marginBottom: "16px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: theme.textMuted,
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: "700",
                  }}
                >
                  Levels
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {isAdminMode && (
                    <button
                      onClick={() =>
                        updateBuildingLevels(
                          Math.max(
                            1,
                            (parseInt(
                              selectedFeature.properties["building:levels"],
                            ) || 1) - 1,
                          ),
                        )
                      }
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "14px",
                        border: "none",
                        backgroundColor: theme.danger,
                        color: "#fff",
                        fontSize: "24px",
                      }}
                    >
                      −
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: "42px",
                      fontWeight: "800",
                      color: theme.text,
                    }}
                  >
                    {parseInt(selectedFeature.properties["building:levels"]) ||
                      1}
                  </span>
                  {isAdminMode && (
                    <button
                      onClick={() =>
                        updateBuildingLevels(
                          (parseInt(
                            selectedFeature.properties["building:levels"],
                          ) || 1) + 1,
                        )
                      }
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "14px",
                        border: "none",
                        backgroundColor: theme.success,
                        color: "#fff",
                        fontSize: "24px",
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
                {isAdminMode && (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: `1px solid ${theme.border}`,
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: theme.textMuted,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: "700",
                      }}
                    >
                      Underground Floors
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <button
                        onClick={() =>
                          updateUndergroundLevels(
                            Math.max(
                              0,
                              (parseInt(
                                selectedFeature.properties[
                                  "building:levels:underground"
                                ],
                              ) || 0) - 1,
                            ),
                          )
                        }
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: theme.danger,
                          color: "#fff",
                          fontSize: "18px",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontSize: "24px",
                          fontWeight: "800",
                          color: theme.text,
                        }}
                      >
                        {parseInt(
                          selectedFeature.properties[
                            "building:levels:underground"
                          ],
                        ) || 0}
                      </span>
                      <button
                        onClick={() =>
                          updateUndergroundLevels(
                            (parseInt(
                              selectedFeature.properties[
                                "building:levels:underground"
                              ],
                            ) || 0) + 1,
                          )
                        }
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: theme.success,
                          color: "#fff",
                          fontSize: "18px",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {isAdminMode && (
                <div
                  style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
                >
                  <button
                    onClick={handleSave}
                    style={{ ...glassButton(theme, "blue"), flex: 1 }}
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={deleteBuilding}
                    style={{ ...glassButton(theme, "danger"), flex: 1 }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsEditingFloorplan(true)}
                style={{ ...glassButton(theme, "purple"), width: "100%" }}
              >
                {isAdminMode ? "✏️ Edit Floorplan" : "👁️ View Floorplan"}
              </button>
            </div>
          )}

          {/* Navigation Panel */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "24px",
              width: "320px",
              zIndex: 15,
              ...panelBase,
            }}
          >
            <h3
              style={{
                margin: "0 0 16px",
                color: theme.accent,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontWeight: "700",
              }}
            >
              🗺️ Navigation
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <select
                value={navStartId}
                onChange={(e) => setNavStartId(e.target.value)}
                style={{ ...glassInput(theme), width: "100%" }}
              >
                <option value="">From...</option>
                {availableBuildings.map((f) => (
                  <option
                    key={"s_" + f.properties["@id"]}
                    value={f.properties["@id"]}
                  >
                    {f.properties.name}
                  </option>
                ))}
              </select>
              <select
                value={navEndId}
                onChange={(e) => setNavEndId(e.target.value)}
                style={{ ...glassInput(theme), width: "100%" }}
              >
                <option value="">To...</option>
                {availableBuildings.map((f) => (
                  <option
                    key={"e_" + f.properties["@id"]}
                    value={f.properties["@id"]}
                  >
                    {f.properties.name}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={startNavigation}
                  disabled={isNavigating}
                  style={{
                    ...glassButton(theme, "accent"),
                    flex: 1,
                    backgroundColor: theme.accentSecondary,
                  }}
                >
                  {isNavigating ? "..." : "GO 🚀"}
                </button>
                <button
                  onClick={resetNavigation}
                  style={{ ...glassButton(theme, "default"), width: "50px" }}
                >
                  ✕
                </button>
              </div>
            </div>
            {routeGeoJSON && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  background: `${theme.accentSecondary}22`,
                  borderRadius: "14px",
                  fontSize: "12px",
                  color: theme.accentSecondary,
                }}
              >
                ✓ {routeGeoJSON.properties.from} → {routeGeoJSON.properties.to}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div
            style={{
              position: "absolute",
              top: "100px",
              right: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                ...glassPanel(theme),
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  map.current?.easeTo({ bearing: 0, pitch: 0, duration: 1000 })
                }
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: theme.surface,
                  color: theme.accent,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                N
              </button>
              <button
                onClick={() =>
                  map.current?.easeTo({
                    pitch: 60,
                    bearing: -20,
                    duration: 1000,
                  })
                }
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: theme.surface,
                  color: theme.text,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                3D
              </button>
            </div>
            <div style={{ ...glassPanel(theme), padding: "16px" }}>
              <h4
                style={{
                  margin: "0 0 12px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: theme.textMuted,
                  fontWeight: "700",
                }}
              >
                Levels
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {(() => {
                  const range = [3, 2, 1, 0, -1, -2];
                  return range.map((level) => (
                    <button
                      key={level}
                      onClick={() => setCurrentLevel(level)}
                      style={{
                        padding: "12px 16px",
                        backgroundColor:
                          currentLevel === level ? theme.accent : theme.surface,
                        color: currentLevel === level ? "#000" : theme.text,
                        border: "none",
                        borderRadius: "10px",
                        fontWeight: currentLevel === level ? "700" : "500",
                        textAlign: "left",
                      }}
                    >
                      {level === 0 ? "Ground" : `Level ${level}`}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floorplan Editor */}
      {isEditingFloorplan && selectedFeature && (
        <FloorplanEditor
          building={selectedFeature}
          geoJsonData={geoJsonData}
          setGeoJsonData={setGeoJsonData}
          mapRef={map}
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
