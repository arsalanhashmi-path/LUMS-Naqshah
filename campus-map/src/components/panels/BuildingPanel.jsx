import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Save, Trash2, Edit, Eye, Minus, Plus } from "lucide-react";

export default function BuildingPanel({
  isMobile,
  isDarkMode,
  selectedFeature,
  isAdminMode,
  updateBuildingLevels,
  updateUndergroundLevels,
  handleSave,
  deleteBuilding,
  setIsEditingFloorplan,
  onClose,
}) {
  if (!selectedFeature) return null;

  const levels = parseInt(selectedFeature.properties["building:levels"]) || 1;
  const undergroundLevels =
    parseInt(selectedFeature.properties["building:levels:underground"]) || 0;

  return (
    <Card
      className={`${isDarkMode ? "glass-panel-dark" : "glass-panel"} ${!isMobile && "w-[300px]"}`}
    >
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold text-foreground">
          {selectedFeature.properties.name || "Building"}
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="h-6 w-6" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Levels Display */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-pink-500/10">
          <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-3">
            Levels
          </label>
          <div className="flex items-center justify-between">
            {isAdminMode && (
              <Button
                variant="destructive"
                size="icon-lg"
                onClick={() => updateBuildingLevels(Math.max(1, levels - 1))}
              >
                <Minus className="h-5 w-5" />
              </Button>
            )}
            <div className="text-center flex-1">
              <span className="text-4xl font-extrabold text-foreground">
                {levels}
              </span>
              <span className="block text-[11px] uppercase text-muted-foreground">
                Floors
              </span>
            </div>
            {isAdminMode && (
              <Button
                variant="success"
                size="icon-lg"
                onClick={() => updateBuildingLevels(levels + 1)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Underground Levels (Admin only) */}
          {isAdminMode && (
            <div className="mt-3 pt-3 border-t border-border">
              <label className="block text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2">
                Underground Floors
              </label>
              <div className="flex items-center justify-between">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    updateUndergroundLevels(Math.max(0, undergroundLevels - 1))
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-extrabold text-foreground">
                  {undergroundLevels}
                </span>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => updateUndergroundLevels(undergroundLevels + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isAdminMode && (
          <div className="flex gap-2">
            <Button variant="blue" className="flex-1" onClick={handleSave}>
              <Save className="h-4 w-4" />
              {!isMobile && "Save"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={deleteBuilding}
            >
              <Trash2 className="h-4 w-4" />
              {!isMobile && "Delete"}
            </Button>
          </div>
        )}

        <Button
          variant={isAdminMode ? "purple" : "outline"}
          className="w-full gap-2"
          onClick={() => setIsEditingFloorplan(true)}
        >
          {isAdminMode ? (
            <>
              <Edit className="h-4 w-4" />
              Edit Floorplan
            </>
          ) : (
            "View Floorplan"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
