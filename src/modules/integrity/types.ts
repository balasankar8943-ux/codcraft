// src/modules/integrity/types.ts

/**
 * State machine states for the Integrity Monitoring Engine
 */
export type IntegrityState =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'OK'
  | 'WARNING'
  | 'VIOLATION'
  | 'DISQUALIFY_PENDING'
  | 'ERROR';

/**
 * Strict union of all detectable violation types
 */
export type ViolationType =
  | 'NO_FACE_DETECTED'     // No face in frame > threshold seconds
  | 'MULTIPLE_FACES'       // > 1 face detected in frame
  | 'FACE_TURNED_AWAY'     // Face oriented away from camera > threshold seconds
  | 'LOW_VISIBILITY'       // Frame too dark or blurry for reliable detection
  | 'TAB_HIDDEN'           // Browser tab hidden (Page Visibility API)
  | 'FOCUS_LOST'           // Window focus lost / blur event
  | 'PASTE_ATTEMPTED'      // Clipboard paste event inside battle arena
  | 'CAMERA_DISCONNECTED'; // Video track ended, revoked, or stream error

/**
 * Severity level of an integrity violation
 */
export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Emitted violation event payload
 */
export interface ViolationEvent {
  id: string;
  type: ViolationType;
  severity: ViolationSeverity;
  timestamp: number;
  durationMs: number;
  details?: Record<string, unknown>;
}

/**
 * Configurable thresholds and tuning parameters for the Integrity Monitor
 */
export interface IntegrityConfig {
  /** Target checks per second (Default: 3 fps) */
  fps: number;
  /** Seconds of missing face before triggering NO_FACE_DETECTED (Default: 3.0s) */
  noFaceThresholdSec: number;
  /** Seconds of turned-away face before triggering FACE_TURNED_AWAY (Default: 2.0s) */
  turnAwayThresholdSec: number;
  /** Luminance threshold below which frame is flagged as LOW_VISIBILITY (Default: 35 out of 255) */
  darkLuminanceThreshold: number;
  /** Score at or below which state shifts to DISQUALIFY_PENDING (Default: 40) */
  disqualifyScoreThreshold: number;
  /** Minimum milliseconds between repeat events for the same violation type (Default: 3000ms) */
  cooldownMs: number;
  /** Recovery interval in seconds of continuous OK state to regain 1 point (Default: 5s) */
  recoveryIntervalSec: number;
  /** Max recovery score ceiling if any HIGH/CRITICAL violation has occurred (Default: 85) */
  highSeverityMaxScoreCeiling: number;
}

/**
 * Default configuration constants
 */
export const DEFAULT_INTEGRITY_CONFIG: IntegrityConfig = {
  fps: 3,
  noFaceThresholdSec: 3.0,
  turnAwayThresholdSec: 2.0,
  darkLuminanceThreshold: 35,
  disqualifyScoreThreshold: 40,
  cooldownMs: 3000,
  recoveryIntervalSec: 5,
  highSeverityMaxScoreCeiling: 85
};

/**
 * Point deduction rules per violation type
 */
export const DEDUCTION_TABLE: Record<ViolationType, { points: number; severity: ViolationSeverity }> = {
  NO_FACE_DETECTED:     { points: 15, severity: 'HIGH' },
  MULTIPLE_FACES:       { points: 25, severity: 'HIGH' },
  FACE_TURNED_AWAY:     { points: 10, severity: 'MEDIUM' },
  LOW_VISIBILITY:       { points: 5,  severity: 'LOW' },
  TAB_HIDDEN:           { points: 20, severity: 'HIGH' },
  FOCUS_LOST:           { points: 10, severity: 'MEDIUM' },
  PASTE_ATTEMPTED:      { points: 30, severity: 'HIGH' },
  CAMERA_DISCONNECTED: { points: 40, severity: 'CRITICAL' }
};

/**
 * Public status snapshot emitted to caller
 */
export interface IntegrityStatusPayload {
  state: IntegrityState;
  score: number;
  activeViolations: ViolationType[];
  history: ViolationEvent[];
  lastUpdated: number;
}
