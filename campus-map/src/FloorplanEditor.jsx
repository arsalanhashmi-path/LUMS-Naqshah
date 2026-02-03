import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Utensils,
  Briefcase,
  GraduationCap,
  ShoppingBag,
  FlaskConical,
  MapPin,
  Save,
  X,
  Trash2,
  Plus,
  Pencil,
  ArrowUpRight,
  ArrowUpSquare,
} from "lucide-react";

// POI Categories with icons and OSM mapping
const POI_CATEGORIES = [
  { value: "eatery", label: "Eatery", icon: Utensils, color: "#f97316" },
  { value: "office", label: "Office", icon: Briefcase, color: "#3b82f6" },
  {
    value: "classroom",
    label: "Classroom",
    icon: GraduationCap,
    color: "#22c55e",
  },
  { value: "shop", label: "Shop", icon: ShoppingBag, color: "#a855f7" },
  { value: "lab", label: "Lab", icon: FlaskConical, color: "#06b6d4" },
  {
    value: "staircase",
    label: "Stairs",
    icon: ArrowUpRight,
    color: "#64748b",
    osm: { highway: "steps", indoor: "room", room: "staircase" },
  },
  {
    value: "lift",
    label: "Lift",
    icon: ArrowUpSquare,
    color: "#64748b",
    osm: { highway: "elevator", indoor: "room", room: "elevator" },
  },
];

export default function FloorplanEditor({
  building,
  geoJsonData,
  setGeoJsonData,
  mapRef,
  onClose,
  onSave,
  theme,
  isMobile,
  isAdminMode,
}) {
  const [currentFloor, setCurrentFloor] = useState(0);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null); // {lng, lat}
  const [selectedPOI, setSelectedPOI] = useState(null);

  // POI Form State
  const [poiCategory, setPoiCategory] = useState("classroom");
  const [poiRoomNumber, setPoiRoomNumber] = useState("");
  const [poiRoomName, setPoiRoomName] = useState("");
  const [poiPerson, setPoiPerson] = useState("");
  const [poiTiming, setPoiTiming] = useState("");
  const [poiAliases, setPoiAliases] = useState("");

  const buildingId = building?.properties?.["@id"];
  const totalFloors = parseInt(building?.properties?.["building:levels"]) || 1;
  const undergroundLevels =
    parseInt(building?.properties?.["building:levels:underground"]) || 0;

  const minLevel = -1 * undergroundLevels;
  const maxLevel = totalFloors - 1;

  const floors = [];
  for (let i = minLevel; i <= maxLevel; i++) {
    floors.push(i);
  }

  // Filter POIs for this building and floor
  const buildingPOIs = geoJsonData.features.filter(
    (f) =>
      f.properties?.poi === true &&
      f.properties?.building_ref === buildingId &&
      f.properties?.level === currentFloor,
  );

  // Update map camera when building selected - fit to building bounds
  useEffect(() => {
    if (mapRef.current && building && building.geometry) {
      const map = mapRef.current;

      // Calculate bounds from building geometry
      const coords =
        building.geometry.type === "Polygon"
          ? building.geometry.coordinates[0]
          : building.geometry.coordinates.flat(2);

      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (acc, coord) => {
            const [lng, lat] = Array.isArray(coord[0]) ? coord : coord;
            return [
              [Math.min(acc[0][0], lng), Math.min(acc[0][1], lat)],
              [Math.max(acc[1][0], lng), Math.max(acc[1][1], lat)],
            ];
          },
          [
            [Infinity, Infinity],
            [-Infinity, -Infinity],
          ],
        );

        // Fit to bounds with padding, top-down view
        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 50, right: 50 },
          pitch: 0,
          bearing: 0,
          duration: 800,
        });
      }
    }
  }, [building, mapRef]);

  // Map click handler for adding points
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      if (isAddingPoint) {
        setPendingPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        setIsAddingPoint(false);
      }
    };

    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [isAddingPoint, mapRef]);

  // POI Marker Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Add source if doesn't exist
    if (!map.getSource("poi-markers")) {
      map.addSource("poi-markers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "poi-markers-circle",
        type: "circle",
        source: "poi-markers",
        paint: {
          "circle-radius": 12,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "poi-markers-label",
        type: "symbol",
        source: "poi-markers",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-offset": [0, 2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": theme?.text || "#333",
          "text-halo-color": "#fff",
          "text-halo-width": 1,
        },
      });
    }

    // Update source data
    const poiFeatures = buildingPOIs.map((poi) => {
      const cat = POI_CATEGORIES.find(
        (c) => c.value === poi.properties.category,
      );
      return {
        type: "Feature",
        geometry: poi.geometry,
        properties: {
          color: cat?.color || "#888",
          label: poi.properties.room_number || poi.properties.room_name || "",
        },
      };
    });

    map.getSource("poi-markers")?.setData({
      type: "FeatureCollection",
      features: poiFeatures,
    });
  }, [buildingPOIs, mapRef, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) {
        ["poi-markers-circle", "poi-markers-label"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource("poi-markers")) map.removeSource("poi-markers");
      }
    };
  }, [mapRef]);

  const resetForm = () => {
    setPoiCategory("classroom");
    setPoiRoomNumber("");
    setPoiRoomName("");
    setPoiPerson("");
    setPoiTiming("");
    setPoiAliases("");
    setPendingPoint(null);
    setSelectedPOI(null);
  };

  const savePOI = () => {
    if (!pendingPoint && !selectedPOI) return;

    const aliasArray = poiAliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const poiData = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: pendingPoint
          ? [pendingPoint.lng, pendingPoint.lat]
          : selectedPOI.geometry.coordinates,
      },
      properties: {
        "@id": selectedPOI?.properties?.["@id"] || `poi_${Date.now()}`,
        poi: true,
        building_ref: buildingId,
        level: currentFloor,
        category: poiCategory,
        room_number: poiRoomNumber,
        room_name: poiRoomName,
        person: poiPerson,
        timing: poiTiming,
        aliases: aliasArray,
        ...(POI_CATEGORIES.find((c) => c.value === poiCategory)?.osm || {}),
      },
    };

    setGeoJsonData((prev) => {
      const filtered = prev.features.filter(
        (f) => f.properties?.["@id"] !== poiData.properties["@id"],
      );
      return { ...prev, features: [...filtered, poiData] };
    });

    resetForm();
  };

  const deletePOI = (poiId) => {
    if (window.confirm("Delete this point?")) {
      setGeoJsonData((prev) => ({
        ...prev,
        features: prev.features.filter((f) => f.properties?.["@id"] !== poiId),
      }));
      resetForm();
    }
  };

  const editPOI = (poi) => {
    setSelectedPOI(poi);
    setPoiCategory(poi.properties.category || "classroom");
    setPoiRoomNumber(poi.properties.room_number || "");
    setPoiRoomName(poi.properties.room_name || "");
    setPoiPerson(poi.properties.person || "");
    setPoiTiming(poi.properties.timing || "");
    setPoiAliases((poi.properties.aliases || []).join(", "));
  };

  const handleClose = () => {
    resetForm();
    if (mapRef.current)
      mapRef.current.easeTo({
        pitch: 60,
        bearing: -20,
        zoom: 17,
        duration: 800,
      });
    onClose();
  };

  const CategoryIcon = ({ category, size = 16 }) => {
    const cat = POI_CATEGORIES.find((c) => c.value === category);
    const IconComp = cat?.icon || MapPin;
    return <IconComp size={size} style={{ color: cat?.color }} />;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {/* --- FLOATING TOOLBAR --- */}
      <div
        className={`absolute top-[80px] left-1/2 -translate-x-1/2 glass-panel flex flex-col items-center gap-3 pointer-events-auto z-[100] px-5 py-4 rounded-xl relative w-fit`}
      >
        {/* Close X with red circle */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>

        <h3 className="m-0 text-sm md:text-base font-semibold text-foreground whitespace-nowrap">
          {building?.properties?.name || "Building"}
        </h3>
        <div className="flex gap-1.5">
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setCurrentFloor(f)}
              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                currentFloor === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-secondary-foreground hover:bg-secondary"
              }`}
            >
              {f === 0 ? "G" : f}
            </button>
          ))}
        </div>
        {isAdminMode && (
          <Button
            size="sm"
            onClick={onSave}
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Save size={14} /> Save
          </Button>
        )}
      </div>

      {/* --- POI FORM MODAL --- */}
      {(pendingPoint || selectedPOI) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center pointer-events-auto z-[200] overflow-y-auto">
          <div
            className={`glass-panel w-full md:w-[420px] max-w-full md:max-w-[90%] p-5 md:p-6 shadow-2xl ${isMobile ? "rounded-t-2xl max-h-[85vh] overflow-y-auto" : "rounded-2xl"}`}
          >
            <h3 className="mt-0 text-primary flex items-center gap-2 mb-4 text-xl font-bold">
              <MapPin size={20} />
              {selectedPOI ? "Edit Point" : "Add Point"}
            </h3>

            {/* Category Selector */}
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 block">
              Category
            </label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {POI_CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setPoiCategory(cat.value)}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all ${
                      poiCategory === cat.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                    style={{ minWidth: 70 }}
                  >
                    <IconComp size={20} style={{ color: cat.color }} />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Room Number */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">
                Room Number
              </label>
              <Input
                value={poiRoomNumber}
                onChange={(e) => setPoiRoomNumber(e.target.value)}
                placeholder="e.g. 301"
                className="bg-background/50"
              />
            </div>

            {/* Room Name */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">
                Room Name
              </label>
              <Input
                value={poiRoomName}
                onChange={(e) => setPoiRoomName(e.target.value)}
                placeholder="e.g. Computer Lab"
                className="bg-background/50"
              />
            </div>

            {/* Person */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">
                Person
              </label>
              <Input
                value={poiPerson}
                onChange={(e) => setPoiPerson(e.target.value)}
                placeholder="e.g. Dr. Ahmed"
                className="bg-background/50"
              />
            </div>

            {/* Timing */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">
                Timing
              </label>
              <Input
                value={poiTiming}
                onChange={(e) => setPoiTiming(e.target.value)}
                placeholder="e.g. Mon-Fri 9AM-5PM"
                className="bg-background/50"
              />
            </div>

            {/* Aliases */}
            <div className="mb-5">
              <label className="text-xs text-muted-foreground mb-1 block">
                Aliases (comma-separated)
              </label>
              <Input
                value={poiAliases}
                onChange={(e) => setPoiAliases(e.target.value)}
                placeholder="e.g. CS Lab, Lab 1"
                className="bg-background/50"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={savePOI}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {selectedPOI ? "Update" : "Save"} Point
              </Button>
              <Button
                onClick={resetForm}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR (POI LIST) --- */}
      {!isMobile && !isAddingPoint && !pendingPoint && !selectedPOI && (
        <div className="absolute right-6 bottom-6 w-[280px] glass-panel pointer-events-auto p-5 flex flex-col gap-4 max-h-[50vh] overflow-hidden rounded-xl">
          {isAdminMode && (
            <Button
              onClick={() => setIsAddingPoint(true)}
              className="w-full gap-2"
            >
              <Plus size={16} /> Add Point
            </Button>
          )}

          <div>
            <h4 className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              Points ({buildingPOIs.length})
            </h4>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
              {buildingPOIs.map((poi) => (
                <div
                  key={poi.properties["@id"]}
                  onClick={() => isAdminMode && editPOI(poi)}
                  className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all border bg-card/50 border-border hover:bg-muted/50`}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      category={poi.properties.category}
                      size={18}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {poi.properties.room_number ||
                          poi.properties.room_name ||
                          "Unnamed"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {
                          POI_CATEGORIES.find(
                            (c) => c.value === poi.properties.category,
                          )?.label
                        }
                      </span>
                    </div>
                  </div>
                  {isAdminMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePOI(poi.properties["@id"]);
                      }}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {!buildingPOIs.length && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No points. {isAdminMode ? "Add one!" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE BOTTOM SHEET (POI LIST) --- */}
      {isMobile && !isAddingPoint && !pendingPoint && !selectedPOI && (
        <div className="fixed bottom-0 left-0 right-0 glass-panel pointer-events-auto p-4 rounded-t-2xl max-h-[40vh] overflow-hidden z-[100]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              Points ({buildingPOIs.length})
            </h4>
            {isAdminMode && (
              <Button
                size="sm"
                onClick={() => setIsAddingPoint(true)}
                className="gap-1"
              >
                <Plus size={14} /> Add
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(40vh-80px)] custom-scrollbar">
            {buildingPOIs.map((poi) => (
              <div
                key={poi.properties["@id"]}
                onClick={() => isAdminMode && editPOI(poi)}
                className="p-3 rounded-xl flex justify-between items-center border bg-card/50 border-border"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon category={poi.properties.category} size={16} />
                  <span className="text-sm font-medium text-foreground">
                    {poi.properties.room_number ||
                      poi.properties.room_name ||
                      "Unnamed"}
                  </span>
                </div>
                {isAdminMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePOI(poi.properties["@id"]);
                    }}
                    className="text-destructive p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {!buildingPOIs.length && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No points yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- ADD POINT MODE INDICATOR --- */}
      {isAddingPoint && (
        <div
          className={`fixed ${isMobile ? "bottom-4 left-4 right-4" : "bottom-10 left-1/2 -translate-x-1/2"} glass-panel p-4 flex items-center gap-4 pointer-events-auto rounded-xl shadow-2xl z-[100]`}
        >
          <MapPin size={24} className="text-primary" />
          <span className="text-sm font-medium flex-1">
            Tap on map to place point
          </span>
          <Button
            onClick={() => setIsAddingPoint(false)}
            variant="destructive"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function getCentroid(feature) {
  if (!feature?.geometry) return null;
  let coords = feature.geometry.coordinates;
  if (feature.geometry.type === "Polygon") coords = coords[0];
  else if (feature.geometry.type === "MultiPolygon") coords = coords[0][0];
  else return null;
  let sumLng = 0,
    sumLat = 0,
    count = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
    count++;
  }
  return count > 0 ? [sumLng / count, sumLat / count] : null;
}
