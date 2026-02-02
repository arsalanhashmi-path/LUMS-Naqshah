import React, { useState, useEffect } from "react";
import { glassPanel, glassButton, glassInput } from "./theme";

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
  const [roomNumber, setRoomNumber] = useState("");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("room");

  // --- ROOM TYPES CONFIG ---
  const numberedTypes = [
    "office",
    "classroom",
    "lab",
    "discussion_room",
    "ta_room",
    "hostel_room",
  ];

  const roomCategories = {
    "Learning & Work": [
      { value: "classroom", label: "📚 Classroom" },
      { value: "office", label: "💼 Office" },
      { value: "lab", label: "🔬 Lab" },
      { value: "discussion_room", label: "💬 Discussion" },
      { value: "ta_room", label: "🧑‍🏫 TA Room" },
    ],
    Amenities: [
      { value: "eatery", label: "🍔 Eatery" },
      { value: "bathroom", label: "🚻 Bathroom" },
      { value: "atm", label: "🏧 ATM" },
      { value: "hostel_room", label: "🛏️ Hostel" },
      { value: "prayer_room", label: "🕌 Prayer" },
    ],
    Infrastructure: [
      { value: "corridor", label: "🚪 Corridor" },
      { value: "stairs", label: "🪜 Stairs" }, // Use specific stairs tool later?
      { value: "lift", label: "🛗 Lift" },
      { value: "room", label: "📦 Generic" },
    ],
  };

  const allRoomTypes = Object.values(roomCategories).flat();

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDrawing) return;
      if (e.key === "Escape") {
        cancelDrawing();
      } else if (e.key === "Enter") {
        if (drawingPoints.length >= 3) setShowRoomForm(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        setDrawingPoints((prev) => prev.slice(0, -1));
      } else if (e.key === "Backspace") {
        // Optional: Backspace to undo, but check if input is focused!
        // Simple check: document.activeElement
        if (document.activeElement.tagName !== "INPUT") {
          setDrawingPoints((prev) => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, drawingPoints]);

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
  const buildingRooms = geoJsonData.features.filter(
    (f) =>
      f.properties?.building_ref === buildingId &&
      f.properties?.level === currentFloor,
  );

  // Update map camera when building selected
  useEffect(() => {
    if (mapRef.current && building) {
      const centroid = getCentroid(building);
      if (centroid)
        mapRef.current.easeTo({
          center: centroid,
          zoom: 19,
          pitch: 0,
          bearing: 0,
          duration: 800,
        });
    }
  }, [building, mapRef]);

  // Map clicks for drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e) => {
      if (isDrawing && !showRoomForm)
        setDrawingPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [isDrawing, showRoomForm, mapRef]);

  // Drawing Preview Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getSource("drawing-preview")) {
      map.addSource("drawing-preview", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "drawing-preview-fill",
        type: "fill",
        source: "drawing-preview",
        paint: { "fill-color": theme.accent, "fill-opacity": 0.3 },
      });
      map.addLayer({
        id: "drawing-preview-line",
        type: "line",
        source: "drawing-preview",
        paint: {
          "line-color": theme.accent,
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
      map.addLayer({
        id: "drawing-preview-points",
        type: "circle",
        source: "drawing-preview",
        paint: { "circle-radius": 6, "circle-color": theme.accentSecondary },
      });
    }
    const features = [];
    drawingPoints.forEach((pt) =>
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: pt },
      }),
    );
    if (drawingPoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [...drawingPoints, drawingPoints[0]],
        },
      });
    }
    if (drawingPoints.length >= 3)
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...drawingPoints, drawingPoints[0]]],
        },
      });
    map
      .getSource("drawing-preview")
      ?.setData({ type: "FeatureCollection", features });
  }, [drawingPoints, mapRef, theme]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) {
        [
          "drawing-preview-fill",
          "drawing-preview-line",
          "drawing-preview-points",
        ].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource("drawing-preview"))
          map.removeSource("drawing-preview");
      }
    };
  }, [mapRef]);

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    setSelectedRoom(null);
    setShowRoomForm(false);
  };
  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setShowRoomForm(false);
  };
  const finishDrawing = () => {
    if (drawingPoints.length < 3) return alert("Need at least 3 points");

    // Construct Name
    let finalName = roomName;
    if (roomNumber && numberedTypes.includes(roomType)) {
      finalName = `${roomNumber}`; // E.g. "302"
      // Should we append type? User can type "Lab 302" if they want, or we just store number.
    } else if (!finalName) {
      // Auto-name if empty
      const label =
        allRoomTypes.find((t) => t.value === roomType)?.label || "Room";
      finalName = `${label} ${buildingRooms.length + 1}`;
    }

    setGeoJsonData((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        {
          type: "Feature",
          properties: {
            "@id": `room/${Date.now()}`,
            level: currentFloor,
            room: roomType,
            room_number: roomNumber, // NEW FIELD
            name: finalName,
            building_ref: buildingId,
            amenity: roomCategories["Amenities"].some(
              (a) => a.value === roomType,
            )
              ? roomType
              : undefined,
          },
          geometry: {
            type: "Polygon",
            coordinates: [[...drawingPoints, drawingPoints[0]]],
          },
        },
      ],
    }));
    setIsDrawing(false);
    setDrawingPoints([]);
    setRoomName("");
    setRoomNumber("");
    setRoomType("room");
    setShowRoomForm(false);
  };
  const deleteRoom = (roomId) => {
    if (window.confirm("Delete room?")) {
      setGeoJsonData((prev) => ({
        ...prev,
        features: prev.features.filter((f) => f.properties?.["@id"] !== roomId),
      }));
      setSelectedRoom(null);
    }
  };
  const handleClose = () => {
    cancelDrawing();
    if (mapRef.current)
      mapRef.current.easeTo({
        pitch: 60,
        bearing: -20,
        zoom: 17,
        duration: 800,
      });
    onClose();
  };

  const panelStyle = {
    ...glassPanel(theme),
    padding: isMobile ? "16px" : "20px",
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
      {/* --- FLOATING TOOLBAR (Top for Nav/Floors) --- */}
      <div
        style={{
          position: "absolute",
          top: isMobile ? "16px" : "20px",
          left: "50%",
          transform: "translateX(-50%)",
          ...panelStyle,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "12px" : "20px",
          pointerEvents: "auto",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: isMobile ? "90%" : "auto",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: isMobile ? "14px" : "16px",
            color: theme.text,
            fontWeight: "700",
            whiteSpace: "nowrap",
          }}
        >
          ✏️ {building?.properties?.name || "Building"}
        </h3>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setCurrentFloor(f)}
              style={{
                padding: isMobile ? "8px 12px" : "8px 14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor:
                  currentFloor === f ? theme.accent : theme.surface,
                color: currentFloor === f ? "#000" : theme.text,
                cursor: "pointer",
                fontWeight: currentFloor === f ? "700" : "500",
                fontSize: isMobile ? "12px" : "14px",
              }}
            >
              {f === 0 ? "G" : f}
            </button>
          ))}
        </div>
        {!isDrawing && (
          <div style={{ display: "flex", gap: "10px" }}>
            {isAdminMode && (
              <button
                onClick={onSave}
                style={{
                  ...glassButton(theme, "blue"),
                  padding: isMobile ? "8px 14px" : "10px 20px",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              >
                💾 Save
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                ...glassButton(theme, "danger"),
                padding: isMobile ? "8px 14px" : "10px 20px",
                fontSize: isMobile ? "12px" : "14px",
              }}
            >
              ✕ Close
            </button>
          </div>
        )}
      </div>

      {/* --- DRAWING CONTROLS (Floating Bottom) --- */}
      {isAdminMode && isDrawing && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            ...glassPanel(theme),
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            pointerEvents: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ textAlign: "center", marginRight: "10px" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: theme.accent,
              }}
            >
              {drawingPoints.length}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: theme.textMuted,
                textTransform: "uppercase",
              }}
            >
              Points
            </div>
          </div>

          <button
            onClick={() => {
              setDrawingPoints((p) => p.slice(0, -1));
            }}
            disabled={drawingPoints.length === 0}
            style={{ ...glassButton(theme, "default"), padding: "12px" }}
          >
            ↩️ Undo
          </button>

          <button
            onClick={() => {
              if (drawingPoints.length >= 3) setShowRoomForm(true);
              else alert("Need 3 points!");
            }}
            disabled={drawingPoints.length < 3}
            style={{ ...glassButton(theme, "success"), padding: "12px 24px" }}
          >
            ✅ Finish Shape
          </button>

          <button
            onClick={cancelDrawing}
            style={{ ...glassButton(theme, "danger"), padding: "12px" }}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* --- ROOM DETAILS FORM (Modal-ish) --- */}
      {showRoomForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            zIndex: 200,
          }}
        >
          <div
            style={{
              ...glassPanel(theme),
              width: "400px",
              maxWidth: "90%",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ marginTop: 0, color: theme.accent }}>
              📍 Room Details
            </h3>

            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: theme.textMuted,
                marginBottom: "6px",
              }}
            >
              Type
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                maxHeight: "200px",
                overflowY: "auto",
                marginBottom: "16px",
              }}
            >
              {Object.entries(roomCategories).map(([cat, types]) => (
                <React.Fragment key={cat}>
                  {types.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setRoomType(t.value)}
                      style={{
                        padding: "8px",
                        border:
                          roomType === t.value
                            ? `2px solid ${theme.accent}`
                            : `1px solid ${theme.border}`,
                        borderRadius: "8px",
                        backgroundColor:
                          roomType === t.value
                            ? `${theme.accent}22`
                            : "transparent",
                        color: theme.text,
                        cursor: "pointer",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "18px" }}>
                        {t.label.split(" ")[0]}
                      </div>
                      <div>{t.label.split(" ").slice(1).join(" ")}</div>
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {numberedTypes.includes(roomType) && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: theme.textMuted,
                    marginBottom: "6px",
                  }}
                >
                  Room Number (e.g. 301)
                </label>
                <input
                  autoFocus
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  style={{
                    ...glassInput(theme),
                    width: "100%",
                    padding: "12px",
                    fontSize: "16px",
                  }}
                  placeholder="Number..."
                />
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: theme.textMuted,
                  marginBottom: "6px",
                }}
              >
                Custom Name (Optional)
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                style={{ ...glassInput(theme), width: "100%", padding: "12px" }}
                placeholder={
                  numberedTypes.includes(roomType)
                    ? `e.g. "Biology Lab"`
                    : "Name..."
                }
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={finishDrawing}
                style={{
                  ...glassButton(theme, "success"),
                  flex: 1,
                  padding: "14px",
                }}
              >
                Save Room
              </button>
              <button
                onClick={() => setShowRoomForm(false)}
                style={{
                  ...glassButton(theme, "default"),
                  flex: 1,
                  padding: "14px",
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR (ROOM LIST ONLY) --- */}
      {!isMobile && !isDrawing && (
        <div
          style={{
            position: "absolute",
            left: "24px",
            top: "100px",
            width: "280px",
            ...panelStyle,
            pointerEvents: "auto",
          }}
        >
          {isAdminMode && (
            <button
              onClick={startDrawing}
              style={{
                ...glassButton(theme, "accent"),
                width: "100%",
                padding: "14px",
                marginBottom: "20px",
              }}
            >
              ✏️ Draw New Room
            </button>
          )}

          <h4
            style={{
              margin: "0 0 12px",
              color: theme.textMuted,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: "700",
            }}
          >
            Rooms ({buildingRooms.length})
          </h4>
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {buildingRooms.map((room) => (
              <div
                key={room.properties["@id"]}
                onClick={() => setSelectedRoom(room.properties["@id"])}
                style={{
                  padding: "14px",
                  backgroundColor:
                    selectedRoom === room.properties["@id"]
                      ? `${theme.accent}33`
                      : theme.surface,
                  borderRadius: "14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border:
                    selectedRoom === room.properties["@id"]
                      ? `1px solid ${theme.accent}`
                      : "1px solid transparent",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      color: theme.text,
                      fontWeight: "500",
                    }}
                  >
                    {
                      allRoomTypes
                        .find((t) => t.value === room.properties.room)
                        ?.label.split(" ")[0]
                    }{" "}
                    {room.properties.room_number
                      ? `#${room.properties.room_number}`
                      : ""}{" "}
                    {room.properties.name !== room.properties.room_number &&
                      room.properties.name}
                  </span>
                  <span style={{ fontSize: "11px", color: theme.textMuted }}>
                    {allRoomTypes
                      .find((t) => t.value === room.properties.room)
                      ?.label.split(" ")
                      .slice(1)
                      .join(" ")}
                  </span>
                </div>
                {isAdminMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoom(room.properties["@id"]);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.danger,
                      cursor: "pointer",
                      fontSize: "18px",
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            {!buildingRooms.length && (
              <p
                style={{
                  color: theme.textMuted,
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No rooms. Start drawing!
              </p>
            )}
          </div>
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
