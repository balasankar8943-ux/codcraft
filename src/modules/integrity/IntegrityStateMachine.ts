// src/modules/integrity/IntegrityStateMachine.ts
import {
  DEFAULT_INTEGRITY_CONFIG,
  DEDUCTION_TABLE
} from './types';
import type {
  IntegrityState,
  ViolationType,
  ViolationEvent,
  IntegrityConfig,
  IntegrityStatusPayload
} from './types';

/**
 * State machine managing live battle participant integrity status, score decay/recovery,
 * debounced violation events, and disqualification thresholds.
 */
export class IntegrityStateMachine {
  private state: IntegrityState = 'UNINITIALIZED';
  private score: number = 100.0;
  private config: IntegrityConfig;

  private activeViolationsMap: Map<ViolationType, { startTime: number; eventId: string; lastEmittedTime: number }> = new Map();
  private historyEvents: ViolationEvent[] = [];
  private hasHighSeverityViolation: boolean = false;

  private consecutiveOkTicks: number = 0;
  private onStateChangeCallback?: (payload: IntegrityStatusPayload) => void;
  private onViolationCallback?: (event: ViolationEvent) => void;

  constructor(
    config: Partial<IntegrityConfig> = {},
    callbacks?: {
      onStateChange?: (payload: IntegrityStatusPayload) => void;
      onViolation?: (event: ViolationEvent) => void;
    }
  ) {
    this.config = { ...DEFAULT_INTEGRITY_CONFIG, ...config };
    this.onStateChangeCallback = callbacks?.onStateChange;
    this.onViolationCallback = callbacks?.onViolation;
  }

  public getState(): IntegrityState {
    return this.state;
  }

  public getScore(): number {
    return this.score;
  }

  public getHistory(): ViolationEvent[] {
    return [...this.historyEvents];
  }

  public getActiveViolations(): ViolationType[] {
    return Array.from(this.activeViolationsMap.keys());
  }

  public getPayload(): IntegrityStatusPayload {
    return {
      state: this.state,
      score: this.score,
      activeViolations: this.getActiveViolations(),
      history: this.getHistory(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Transition to INITIALIZING state
   */
  public transitionToInitializing(): void {
    if (this.state === 'DISQUALIFY_PENDING' || this.state === 'ERROR') return;
    this.setState('INITIALIZING');
  }

  /**
   * Transition to OK state once setup is verified
   */
  public transitionToReady(): void {
    if (this.state === 'DISQUALIFY_PENDING' || this.state === 'ERROR') return;
    this.setState('OK');
  }

  /**
   * Shift state to ERROR (e.g., stream failure or permission denial)
   */
  public transitionToError(reason: string): void {
    this.triggerViolation('CAMERA_DISCONNECTED', { reason });
    this.setState('ERROR');
  }

  /**
   * Report a detected violation condition during tick analysis
   */
  public triggerViolation(type: ViolationType, details?: Record<string, unknown>, now = Date.now()): void {
    if (this.state === 'DISQUALIFY_PENDING' || this.state === 'ERROR') return;

    this.consecutiveOkTicks = 0;
    const rule = DEDUCTION_TABLE[type];
    const existing = this.activeViolationsMap.get(type);

    if (rule.severity === 'HIGH' || rule.severity === 'CRITICAL') {
      this.hasHighSeverityViolation = true;
    }

    if (!existing) {
      // New violation episode
      const eventId = `v_${now}_${Math.random().toString(36).substr(2, 6)}`;
      this.activeViolationsMap.set(type, { startTime: now, eventId, lastEmittedTime: now });

      // Deduct points
      this.deductScore(rule.points);

      const event: ViolationEvent = {
        id: eventId,
        type,
        severity: rule.severity,
        timestamp: now,
        durationMs: 0,
        details
      };

      this.historyEvents.push(event);
      if (this.onViolationCallback) {
        this.onViolationCallback(event);
      }

      this.evaluateState();
    } else {
      // Ongoing violation episode - check cooldown before firing repeated notification if applicable
      const durationMs = now - existing.startTime;
      const timeSinceLastEmit = now - existing.lastEmittedTime;

      // Update duration on existing event in history
      const historyIndex = this.historyEvents.findIndex(e => e.id === existing.eventId);
      if (historyIndex !== -1) {
        this.historyEvents[historyIndex].durationMs = durationMs;
      }

      if (timeSinceLastEmit >= this.config.cooldownMs) {
        existing.lastEmittedTime = now;
        const updatedEvent: ViolationEvent = {
          id: existing.eventId,
          type,
          severity: rule.severity,
          timestamp: existing.startTime,
          durationMs,
          details
        };
        if (this.onViolationCallback) {
          this.onViolationCallback(updatedEvent);
        }
      }

      this.evaluateState();
    }
  }

  /**
   * Clear an active violation condition when resolved
   */
  public clearViolation(type: ViolationType, now = Date.now()): void {
    const existing = this.activeViolationsMap.get(type);
    if (existing) {
      const durationMs = now - existing.startTime;
      const historyIndex = this.historyEvents.findIndex(e => e.id === existing.eventId);
      if (historyIndex !== -1) {
        this.historyEvents[historyIndex].durationMs = durationMs;
      }
      this.activeViolationsMap.delete(type);
      this.evaluateState();
    }
  }

  /**
   * Process a clean tick (no active violation detected for current frame)
   */
  public processCleanTick(): void {
    if (this.state === 'DISQUALIFY_PENDING' || this.state === 'ERROR') return;

    if (this.activeViolationsMap.size === 0) {
      this.consecutiveOkTicks++;
      
      // Perform score recovery logic (+1 pt per recoveryIntervalSec * fps ticks)
      const ticksPerRecovery = Math.max(1, Math.round(this.config.recoveryIntervalSec * this.config.fps));
      if (this.consecutiveOkTicks % ticksPerRecovery === 0) {
        this.recoverScore(1.0);
      }

      this.setState('OK');
    } else {
      this.evaluateState();
    }
  }

  /**
   * Deduct points from score and check for disqualification
   */
  private deductScore(points: number): void {
    this.score = Math.max(0, parseFloat((this.score - points).toFixed(2)));
    if (this.score <= this.config.disqualifyScoreThreshold) {
      this.setState('DISQUALIFY_PENDING');
    }
  }

  /**
   * Recover score when in clean state, subject to max ceiling
   */
  private recoverScore(amount: number): void {
    const ceiling = this.hasHighSeverityViolation
      ? this.config.highSeverityMaxScoreCeiling
      : 100.0;

    if (this.score < ceiling) {
      this.score = Math.min(ceiling, parseFloat((this.score + amount).toFixed(2)));
      this.notifyStateChange();
    }
  }

  /**
   * Evaluate state transitions between OK, WARNING, VIOLATION, DISQUALIFY_PENDING
   */
  private evaluateState(): void {
    if (this.score <= this.config.disqualifyScoreThreshold) {
      this.setState('DISQUALIFY_PENDING');
      return;
    }

    if (this.activeViolationsMap.size === 0) {
      this.setState('OK');
      return;
    }

    // Check severities of active violations
    let hasHighOrCritical = false;
    let hasMedium = false;

    for (const type of this.activeViolationsMap.keys()) {
      const severity = DEDUCTION_TABLE[type].severity;
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        hasHighOrCritical = true;
      } else if (severity === 'MEDIUM') {
        hasMedium = true;
      }
    }

    if (hasHighOrCritical) {
      this.setState('VIOLATION');
    } else if (hasMedium || this.activeViolationsMap.size > 0) {
      this.setState('WARNING');
    }
  }

  private setState(newState: IntegrityState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyStateChange();
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getPayload());
    }
  }

  /**
   * Reset engine state
   */
  public reset(): void {
    this.state = 'UNINITIALIZED';
    this.score = 100.0;
    this.activeViolationsMap.clear();
    this.historyEvents = [];
    this.hasHighSeverityViolation = false;
    this.consecutiveOkTicks = 0;
    this.notifyStateChange();
  }
}
