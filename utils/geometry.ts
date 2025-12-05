import { HandLandmark, Point } from '../types';

// Squared distance is faster (avoids Math.sqrt) for simple comparison
export const distanceSq = (p1: HandLandmark | Point, p2: HandLandmark | Point): number => {
  return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
};

export const distance = (p1: HandLandmark | Point, p2: HandLandmark | Point): number => {
  return Math.sqrt(distanceSq(p1, p2));
};

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

// Finger indices: Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
// PIP indices: Thumb: 2, Index: 6, Middle: 10, Ring: 14, Pinky: 18

// --- NEW STABILITY HELPERS ---

// Calculate hand size reference (Wrist to Middle Finger MCP)
export const getHandSize = (landmarks: HandLandmark[]): number => {
  return distance(landmarks[0], landmarks[9]);
};

// Calculate Pinch Ratio (Distance between tips / Hand Size)
// < 0.08 usually means pinch, > 0.12 usually means open
export const getPinchRatio = (landmarks: HandLandmark[], handSize: number): number => {
  return distance(landmarks[8], landmarks[4]) / handSize;
};

// Get the midpoint between index and thumb (more stable than just index)
export const getPinchMidpoint = (landmarks: HandLandmark[]): Point => {
  return {
    x: (landmarks[8].x + landmarks[4].x) / 2,
    y: (landmarks[8].y + landmarks[4].y) / 2
  };
};

export const isFingerExtended = (landmarks: HandLandmark[], tipIdx: number, pipIdx: number): boolean => {
  return distanceSq(landmarks[0], landmarks[tipIdx]) > distanceSq(landmarks[0], landmarks[pipIdx]);
};

// Strict check for open palm
export const detectOpenPalm = (landmarks: HandLandmark[]): boolean => {
  // All fingers must be extended
  if (!isFingerExtended(landmarks, 8, 6)) return false;
  if (!isFingerExtended(landmarks, 12, 10)) return false;
  if (!isFingerExtended(landmarks, 16, 14)) return false;
  if (!isFingerExtended(landmarks, 20, 18)) return false;
  
  // Thumb extended away from palm
  const thumbOut = distance(landmarks[4], landmarks[17]) > distance(landmarks[3], landmarks[17]);
  return thumbOut;
};

export const detectPointing = (landmarks: HandLandmark[]): boolean => {
  const index = isFingerExtended(landmarks, 8, 6);
  const middle = isFingerExtended(landmarks, 12, 10);
  const ring = isFingerExtended(landmarks, 16, 14);
  const pinky = isFingerExtended(landmarks, 20, 18);
  
  return index && !middle && !ring && !pinky;
};

export const detectVictory = (landmarks: HandLandmark[]): boolean => {
  const index = isFingerExtended(landmarks, 8, 6);
  const middle = isFingerExtended(landmarks, 12, 10);
  const ring = isFingerExtended(landmarks, 16, 14);
  const pinky = isFingerExtended(landmarks, 20, 18);
  
  return index && middle && !ring && !pinky;
};

// Region of Interest Check (Avoid edge distortion)
export const isInSafeZone = (point: Point): boolean => {
  return point.x > 0.05 && point.x < 0.95 && point.y > 0.05 && point.y < 0.95;
};