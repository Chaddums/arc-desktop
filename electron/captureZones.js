/**
 * captureZones — Predefined screen regions where Arc Raiders displays quest text.
 * Coordinates are percentages (0–1) of screen resolution for resolution independence.
 * Placeholder values — refine after in-game testing.
 */

const CAPTURE_ZONES = [
  {
    id: "objectiveComplete",
    label: "Objective Complete",
    x: 0.3,
    y: 0.05,
    width: 0.4,
    height: 0.08,
  },
  {
    id: "itemPickup",
    label: "Item Pickup",
    x: 0.65,
    y: 0.75,
    width: 0.3,
    height: 0.12,
  },
  {
    id: "killFeed",
    label: "Kill Feed",
    x: 0.65,
    y: 0.05,
    width: 0.3,
    height: 0.15,
  },
  {
    id: "centerPopup",
    label: "Center Popup",
    x: 0.25,
    y: 0.35,
    width: 0.5,
    height: 0.15,
  },
];

module.exports = CAPTURE_ZONES;
