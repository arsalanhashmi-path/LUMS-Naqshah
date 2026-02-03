import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { themes } from "../theme";

export function useMap(containerRef) {
  const map = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const theme = isDarkMode ? themes.dark : themes.light;

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (map.current || !containerRef.current) return;

    map.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-base-light": {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
          },
          "osm-base-dark": {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
          },
          // Sources will be populated by other hooks/components via setSource/setData
          "campus-data": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
          "world-mask": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
          "route-source": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
        layers: [
          {
            id: "osm-tiles-light",
            type: "raster",
            source: "osm-base-light",
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: "visible" },
          },
          {
            id: "osm-tiles-dark",
            type: "raster",
            source: "osm-base-dark",
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: "none" },
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
              "line-color": "#ef4444",
              "line-width": 12,
              "line-blur": 6,
              "line-opacity": 0.4,
            },
          },
          {
            id: "route-line",
            type: "line",
            source: "route-source",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ef4444", "line-width": 4 },
          },
          {
            id: "building-labels",
            type: "symbol",
            source: "campus-data",
            minzoom: 16,
            filter: [
              "all",
              ["has", "name"],
              ["!=", "name", "Lahore University of Management Sciences"],
              ["any", ["has", "building"], ["has", "building:levels"]],
            ],
            layout: {
              "text-field": ["get", "name"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 16, 9, 18, 12, 20, 14],
              "text-anchor": "center",
              "text-allow-overlap": false,
              "text-ignore-placement": false,
              "text-optional": true,
              "text-padding": 10,
              "text-max-width": 8,
              "text-letter-spacing": 0.05,
              "text-transform": "uppercase",
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            },
            paint: {
              "text-color": "#1e3a8a",
              "text-halo-color": "rgba(255, 255, 255, 0.9)",
              "text-halo-width": 1.5,
              "text-halo-blur": 0.5,
            },
          },
        ],
      },
      center: [74.4098, 31.4705],
      zoom: 17,
      pitch: 60,
      bearing: -20.8,
      maxBounds: [
        [74.404, 31.465],
        [74.416, 31.476],
      ],
      attributionControl: false,
    });

    // Initial Theme Set
     map.current.on('load', () => {
         setMapLoaded(true);
         const style = map.current.getStyle(); 
         if (style && map.current.getLayer("osm-tiles-dark")) {
             map.current.setLayoutProperty("osm-tiles-dark", "visibility", "visible"); // Default to dark start if isDarkMode is true
             map.current.setLayoutProperty("osm-tiles-light", "visibility", "none");
         }
     });

  }, [containerRef]);

  // Handle Theme Toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const style = map.current.getStyle();
    if (!style) return;

    if (
      map.current.getLayer("osm-tiles-light") &&
      map.current.getLayer("osm-tiles-dark")
    ) {
      map.current.setLayoutProperty(
        "osm-tiles-light",
        "visibility",
        isDarkMode ? "none" : "visible"
      );
      map.current.setLayoutProperty(
        "osm-tiles-dark",
        "visibility",
        isDarkMode ? "visible" : "none"
      );
    }

    if (map.current.getLayer("mask-layer")) {
      map.current.setPaintProperty(
        "mask-layer",
        "fill-color",
        isDarkMode ? "#0f172a" : "#f8fafc"
      );
    }

    // Update paths color based on theme
    if (map.current.getLayer("paths-layer")) {
      map.current.setPaintProperty(
        "paths-layer",
        "line-color",
        isDarkMode ? "#ffffff" : "#1a1a1a"
      );
    }

    // Update building labels for theme
    if (map.current.getLayer("building-labels")) {
      map.current.setPaintProperty(
        "building-labels",
        "text-color",
        isDarkMode ? "#ffffff" : "#1e3a8a"
      );
      map.current.setPaintProperty(
        "building-labels",
        "text-halo-color",
        isDarkMode ? "#1e3a8a" : "#ffffff"
      );
    }
  }, [isDarkMode, mapLoaded]);

  return { mapRef: map, isMobile, isDarkMode, setIsDarkMode, theme, isMapLoaded: mapLoaded };
}
