// This is the only file that needs to change when the physical installation changes.
// Coordinates are expressed in pixels inside one shared virtual canvas.
export const SCREEN_CONFIG = {
  debugMode: false,
  background: "#01030a",
  screens: [
    { id: "SCREEN_1", width: 320, height: 1080, x: 0,    y: 0, orientation: 0, transitionDelay: 0.00 },
    { id: "SCREEN_2", width: 320, height: 1080, x: 320,  y: 0, orientation: 0, transitionDelay: 0.18 },
    { id: "SCREEN_3", width: 320, height: 1080, x: 640,  y: 0, orientation: 0, transitionDelay: 0.14 },
    { id: "SCREEN_4", width: 320, height: 1080, x: 960,  y: 0, orientation: 0, transitionDelay: 0.20 },
    { id: "SCREEN_5", width: 320, height: 1080, x: 1280, y: 0, orientation: 0, transitionDelay: 0.12 },
    { id: "SCREEN_6", width: 320, height: 1080, x: 1600, y: 0, orientation: 0, transitionDelay: 0.16 },
    { id: "SCREEN_7", width: 320, height: 1080, x: 1920, y: 0, orientation: 0, transitionDelay: 0.18 },
    { id: "SCREEN_8", width: 320, height: 1080, x: 2240, y: 0, orientation: 0, transitionDelay: 0.00 },
  ],
};
