export const MTA_BLUE = "#003DA5";

// Subway line colors (background)
export const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  // Red
  "1": { bg: "#EE352E", text: "#fff" },
  "2": { bg: "#EE352E", text: "#fff" },
  "3": { bg: "#EE352E", text: "#fff" },
  // Green
  "4": { bg: "#00933C", text: "#fff" },
  "5": { bg: "#00933C", text: "#fff" },
  "6": { bg: "#00933C", text: "#fff" },
  // Blue
  "A": { bg: "#0039A6", text: "#fff" },
  "C": { bg: "#0039A6", text: "#fff" },
  "E": { bg: "#0039A6", text: "#fff" },
  // Orange
  "B": { bg: "#FF6319", text: "#fff" },
  "D": { bg: "#FF6319", text: "#fff" },
  "F": { bg: "#FF6319", text: "#fff" },
  "M": { bg: "#FF6319", text: "#fff" },
  // Purple
  "7": { bg: "#B933AD", text: "#fff" },
  // Yellow
  "N": { bg: "#FCCC0A", text: "#000" },
  "Q": { bg: "#FCCC0A", text: "#000" },
  "R": { bg: "#FCCC0A", text: "#000" },
  "W": { bg: "#FCCC0A", text: "#000" },
  // Gray
  "L": { bg: "#A7A9AC", text: "#fff" },
  // Light green
  "G": { bg: "#6CBE45", text: "#fff" },
  // Teal
  "J": { bg: "#996633", text: "#fff" },
  "Z": { bg: "#996633", text: "#fff" },
  // Dark slate — shuttle trains (GS = 42nd St, FS = Franklin Av, H = Rockaway Park)
  "S":  { bg: "#808183", text: "#fff" },
  "GS": { bg: "#808183", text: "#fff" },
  "FS": { bg: "#808183", text: "#fff" },
  "H":  { bg: "#808183", text: "#fff" },
  // Express variants
  "6X": { bg: "#00933C", text: "#fff" },
  "7X": { bg: "#B933AD", text: "#fff" },
  // Bus (all lines)
  "BUS": { bg: "#0d61a9", text: "#fff" },
};

export const REFRESH_INTERVAL_MS = 30_000;
