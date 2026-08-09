// src/modules/integrity/__tests__/integrityMonitor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrityStateMachine } from '../IntegrityStateMachine';
import { IntegrityDetectorEngine } from '../detectorEngine';
import { DEFAULT_INTEGRITY_CONFIG } from '../types';
import type { ViolationEvent } from '../types';

describe('Integrity Monitoring Engine - Unit Tests', () => {
  let stateMachine: IntegrityStateMachine;
  let emittedEvents: ViolationEvent[];

  beforeEach(() => {
    emittedEvents = [];
    stateMachine = new IntegrityStateMachine(DEFAULT_INTEGRITY_CONFIG, {
      onViolation: (event) => emittedEvents.push(event)
    });
  });

  describe('1. State Machine & Initial Setup', () => {
    it('starts in UNINITIALIZED state with 100.0 score', () => {
      expect(stateMachine.getState()).toBe('UNINITIALIZED');
      expect(stateMachine.getScore()).toBe(100.0);
      expect(stateMachine.getActiveViolations()).toHaveLength(0);
    });

    it('transitions through INITIALIZING to OK state', () => {
      stateMachine.transitionToInitializing();
      expect(stateMachine.getState()).toBe('INITIALIZING');

      stateMachine.transitionToReady();
      expect(stateMachine.getState()).toBe('OK');
    });

    it('transitions to ERROR state on stream failure or permission denial', () => {
      stateMachine.transitionToError('Permission denied');
      expect(stateMachine.getState()).toBe('ERROR');
      expect(emittedEvents.some(e => e.type === 'CAMERA_DISCONNECTED')).toBe(true);
    });
  });

  describe('2. Violation Trigger Conditions', () => {
    beforeEach(() => {
      stateMachine.transitionToInitializing();
      stateMachine.transitionToReady();
    });

    it('triggers LOW_VISIBILITY on dark luminance frame', () => {
      stateMachine.triggerViolation('LOW_VISIBILITY', { luminance: 20 });
      expect(stateMachine.getState()).toBe('WARNING');
      expect(stateMachine.getScore()).toBe(95.0); // 100 - 5
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('LOW_VISIBILITY');
      expect(emittedEvents[0].severity).toBe('LOW');
    });

    it('triggers MULTIPLE_FACES violation immediately', () => {
      stateMachine.triggerViolation('MULTIPLE_FACES', { count: 2 });
      expect(stateMachine.getState()).toBe('VIOLATION');
      expect(stateMachine.getScore()).toBe(75.0); // 100 - 25
      expect(emittedEvents[0].type).toBe('MULTIPLE_FACES');
      expect(emittedEvents[0].severity).toBe('HIGH');
    });

    it('triggers TAB_HIDDEN on visibility change', () => {
      stateMachine.triggerViolation('TAB_HIDDEN');
      expect(stateMachine.getState()).toBe('VIOLATION');
      expect(stateMachine.getScore()).toBe(80.0); // 100 - 20
      expect(emittedEvents[0].type).toBe('TAB_HIDDEN');
    });

    it('triggers FOCUS_LOST on window blur', () => {
      stateMachine.triggerViolation('FOCUS_LOST');
      expect(stateMachine.getState()).toBe('WARNING');
      expect(stateMachine.getScore()).toBe(90.0); // 100 - 10
      expect(emittedEvents[0].type).toBe('FOCUS_LOST');
    });

    it('triggers PASTE_ATTEMPTED violation on paste event', () => {
      stateMachine.triggerViolation('PASTE_ATTEMPTED', { target: 'TEXTAREA' });
      expect(stateMachine.getState()).toBe('VIOLATION');
      expect(stateMachine.getScore()).toBe(70.0); // 100 - 30
      expect(emittedEvents[0].type).toBe('PASTE_ATTEMPTED');
      expect(emittedEvents[0].severity).toBe('HIGH');
    });
  });

  describe('3. Threshold-based Sustained Violation Detection Engine', () => {
    it('sustains NO_FACE_DETECTED only after threshold seconds pass', async () => {
      stateMachine.transitionToReady();
      const engine = new IntegrityDetectorEngine(stateMachine, {
        fps: 2,
        noFaceThresholdSec: 2.0 // 4 ticks at 2 fps = 2000ms
      }, () => ({
        faceCount: 0,
        isTurnedAway: false,
        meanLuminance: 120
      }));

      engine.start();

      // Tick 1 (0.5s): No violation triggered yet
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'NO_FACE_DETECTED')).toBe(false);

      // Tick 2 (1.0s)
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'NO_FACE_DETECTED')).toBe(false);

      // Tick 3 (1.5s)
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'NO_FACE_DETECTED')).toBe(false);

      // Tick 4 (2.0s): Threshold breached
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'NO_FACE_DETECTED')).toBe(true);

      engine.stop();
    });

    it('sustains FACE_TURNED_AWAY after turn away duration threshold', async () => {
      stateMachine.transitionToReady();
      const engine = new IntegrityDetectorEngine(stateMachine, {
        fps: 2,
        turnAwayThresholdSec: 1.0 // 2 ticks
      }, () => ({
        faceCount: 1,
        isTurnedAway: true,
        meanLuminance: 120
      }));

      engine.start();

      // Tick 1 (0.5s)
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'FACE_TURNED_AWAY')).toBe(false);

      // Tick 2 (1.0s): Threshold reached
      await engine.performTick();
      expect(emittedEvents.some(e => e.type === 'FACE_TURNED_AWAY')).toBe(true);

      engine.stop();
    });
  });

  describe('4. Cooldown & Debounce Behavior', () => {
    it('debounces repeat event emission during sustained condition within cooldownMs window', () => {
      stateMachine.transitionToReady();
      const startTime = 1000;

      // Initial trigger at t = 1000
      stateMachine.triggerViolation('MULTIPLE_FACES', { count: 2 }, startTime);
      expect(emittedEvents).toHaveLength(1);

      // Subsequent tick at t = 2000 (within 3000ms cooldown) -> should NOT emit new callback event
      stateMachine.triggerViolation('MULTIPLE_FACES', { count: 2 }, startTime + 1000);
      expect(emittedEvents).toHaveLength(1);

      // Tick after cooldown passes at t = 4500 (3500ms > 3000ms cooldown) -> emits updated event with duration
      stateMachine.triggerViolation('MULTIPLE_FACES', { count: 2 }, startTime + 3500);
      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[1].durationMs).toBe(3500);
    });
  });

  describe('5. Score Decay & Recovery Logic', () => {
    it('recovers score linearly during clean ticks up to 100.0', () => {
      stateMachine.transitionToReady();
      
      // Deduct 10 points (FOCUS_LOST) -> Score becomes 90.0
      stateMachine.triggerViolation('FOCUS_LOST');
      expect(stateMachine.getScore()).toBe(90.0);

      // Clear violation
      stateMachine.clearViolation('FOCUS_LOST');

      // Process 15 clean ticks (5s at 3 fps = 15 ticks) -> recovers +1.0 pt to 91.0
      for (let i = 0; i < 15; i++) {
        stateMachine.processCleanTick();
      }

      expect(stateMachine.getScore()).toBe(91.0);
    });

    it('enforces recovery score ceiling of 85.0 if a HIGH severity violation occurred', () => {
      stateMachine.transitionToReady();

      // Deduct 25 points (MULTIPLE_FACES - HIGH severity) -> Score = 75.0
      stateMachine.triggerViolation('MULTIPLE_FACES');
      expect(stateMachine.getScore()).toBe(75.0);

      stateMachine.clearViolation('MULTIPLE_FACES');

      // Recover for 300 clean ticks (100 seconds)
      for (let i = 0; i < 300; i++) {
        stateMachine.processCleanTick();
      }

      // Should be capped at 85.0 ceiling
      expect(stateMachine.getScore()).toBe(85.0);
    });
  });

  describe('6. Disqualification Threshold', () => {
    it('shifts to DISQUALIFY_PENDING state when score drops <= 40', () => {
      stateMachine.transitionToReady();

      // Deduct 30 (PASTE_ATTEMPTED) -> Score = 70
      stateMachine.triggerViolation('PASTE_ATTEMPTED');
      expect(stateMachine.getState()).toBe('VIOLATION');

      // Deduct 35 more -> Score = 35 (<= 40 threshold)
      stateMachine.triggerViolation('MULTIPLE_FACES'); // 70 - 25 = 45
      stateMachine.triggerViolation('FOCUS_LOST');     // 45 - 10 = 35 <= 40

      expect(stateMachine.getScore()).toBe(35);
      expect(stateMachine.getState()).toBe('DISQUALIFY_PENDING');
    });
  });
});
