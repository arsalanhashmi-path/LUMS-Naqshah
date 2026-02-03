import { useState, useMemo, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { buildGraph, findRoute } from "../pathfinding";

export function useNavigation(geoJsonData, mapRef, isMobile) {
  const [navStartId, setNavStartId] = useState("");
  const [navEndId, setNavEndId] = useState("");
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // --- BUILD ROUTING GRAPH (memoized) ---
  const routingGraph = useMemo(() => {
    // Only build graph if we have data
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
        return null;
    }
    const graph = buildGraph(geoJsonData.features);
    return graph;
  }, [geoJsonData]);

  // --- ACTIONS ---
  const startNavigation = () => {
    if (!navStartId || !navEndId) {
      alert("Select both Start and Destination");
      return;
    } 
    if (navStartId === navEndId) {
       alert("Must be different locations");
       return;
    } 
    setIsNavigating(true);

    const startFeature = geoJsonData.features.find(
      (f) => f.properties["@id"] === navStartId
    );
    const endFeature = geoJsonData.features.find(
      (f) => f.properties["@id"] === navEndId
    );

    if (!startFeature || !endFeature) {
      setIsNavigating(false);
      return;
    }

    if (!routingGraph) {
         setIsNavigating(false);
         console.warn("Routing graph not ready");
         return;
    }

    const route = findRoute(startFeature, endFeature, routingGraph);
    if (!route) {
      setIsNavigating(false);
      alert("No path found");
      return;
    }

    // Animate the path rendering
    const fullCoords = route.geometry.coordinates;
    const duration = 2000; // 2 seconds total for animation
    const frames = fullCoords.length;
    const frameDuration = duration / frames;
    
    let currentFrame = 0;
    
    // Clear previous route first
    setRouteGeoJSON({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: []
      }
    });

    const animate = () => {
      if (currentFrame <= frames) {
        setRouteGeoJSON({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: fullCoords.slice(0, currentFrame)
          }
        });
        currentFrame++;
        setTimeout(animate, frameDuration);
      } else {
        setIsNavigating(false);
      }
    };

    animate();

    // Camera animation
    if (mapRef.current && fullCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      fullCoords.forEach((coord) => bounds.extend(coord));
      mapRef.current.fitBounds(bounds, {
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

  // --- EFFECTS ---
  useEffect(() => {
    if (mapRef.current?.getSource("route-source")) {
      mapRef.current
        .getSource("route-source")
        .setData(routeGeoJSON || { type: "FeatureCollection", features: [] });
    }
  }, [routeGeoJSON, mapRef]);

  return {
    navStartId,
    setNavStartId,
    navEndId,
    setNavEndId,
    routeGeoJSON,
    isNavigating,
    startNavigation,
    resetNavigation,
  };
}
