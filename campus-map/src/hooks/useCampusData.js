import { useState, useEffect, useMemo } from "react";

// API base URL - uses environment variable in production, proxy in dev
const API_BASE = import.meta.env.VITE_API_URL || "";

export function useCampusData(mapRef) {
  const [geoJsonData, setGeoJsonData] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  // --- API FETCH ---
  useEffect(() => {
    fetch(`${API_BASE}/api/campus`)
      .then((res) => res.json())
      .then((data) => {
        setGeoJsonData(data);
        console.log("Loaded campus data from API");
      })
      .catch((err) => {
        console.error("Failed to load campus data:", err);
        alert(
          "⚠️ Failed to load map data. Is the backend server running? (npm start in /backend)"
        );
      });
  }, []);

  // --- DERIVED STATE ---
  const selectedFeature = useMemo(
    () =>
      geoJsonData.features.find(
        (f) => f.properties["@id"] === selectedBuildingId
      ),
    [geoJsonData, selectedBuildingId]
  );

  const availableBuildings = useMemo(
    () =>
      geoJsonData.features
        .filter((f) => {
          const p = f.properties;
          return (p.name || p.room_name || p.room_number) && p["@id"] && (p.building || p.poi);
        })
        .map((f) => {
          // Ensure we have a consistent name property for display
          const p = f.properties;
          const displayName = p.name || p.room_name || (p.room_number ? `Room ${p.room_number}` : "Unnamed Location");
          return {
            ...f,
            properties: {
              ...p,
              name: displayName, // Override/set name for dropdowns
            },
          };
        })
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
    [geoJsonData]
  );

  const boundaryFeature = useMemo(
    () =>
      geoJsonData.features.find(
        (f) =>
          f.properties.name === "Lahore University of Management Sciences" &&
          (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      ),
    [geoJsonData]
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

  // --- EFFECTS TO UPDATE MAP ---
  useEffect(() => {
    if (mapRef.current?.getSource("campus-data")) {
      mapRef.current.getSource("campus-data").setData(geoJsonData);
    }
  }, [geoJsonData, mapRef]);

  useEffect(() => {
    if (mapRef.current?.getSource("world-mask")) {
      const maskData = maskGeoJSON || {
        type: "FeatureCollection",
        features: [],
      };
      mapRef.current.getSource("world-mask").setData(maskData);
    }
  }, [maskGeoJSON, mapRef]);

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
          : f
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
          : f
      ),
    }));
  };

  const deleteBuilding = () => {
    if (!selectedBuildingId || !window.confirm("Delete this building?")) return;
    setGeoJsonData((prev) => ({
      ...prev,
      features: prev.features.filter(
        (f) => f.properties["@id"] !== selectedBuildingId
      ),
    }));
    setSelectedBuildingId(null);
    // Note: Calling component needs to handle UI side effects like closing panels
    if (mapRef.current)
      mapRef.current.setFilter("3d-buildings-highlight", ["in", "@id", ""]);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geoJsonData),
      });
      if (res.ok) {
        alert("Campus data saved to server!");
      } else {
        alert("Failed to save data. Check console.");
        console.error(await res.text());
      }
    } catch (err) {
      console.error(err);
      alert("Error saving data.");
    }
  };

  return {
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
  };
}
