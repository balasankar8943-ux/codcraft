// src/hooks/useIntegrityMonitor.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { IntegrityStateMachine } from '../modules/integrity/IntegrityStateMachine';
import { IntegrityDetectorEngine } from '../modules/integrity/detectorEngine';
import type { DetectionFrameResult } from '../modules/integrity/detectorEngine';
import type {
  IntegrityConfig,
  IntegrityStatusPayload,
  ViolationEvent
} from '../modules/integrity/types';

export interface UseIntegrityMonitorOptions {
  config?: Partial<IntegrityConfig>;
  onViolation?: (event: ViolationEvent) => void;
  onStateChange?: (payload: IntegrityStatusPayload) => void;
  customDetector?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<DetectionFrameResult> | DetectionFrameResult;
  targetContainerRef?: React.RefObject<HTMLElement | null>;
}

export function useIntegrityMonitor(options: UseIntegrityMonitorOptions = {}) {
  const { config, onViolation, onStateChange, customDetector, targetContainerRef } = options;

  const stateMachineRef = useRef<IntegrityStateMachine | null>(null);
  const detectorEngineRef = useRef<IntegrityDetectorEngine | null>(null);

  const [status, setStatus] = useState<IntegrityStatusPayload>({
    state: 'UNINITIALIZED',
    score: 100.0,
    activeViolations: [],
    history: [],
    lastUpdated: Date.now()
  });

  // Initialize State Machine & Detector Engine
  useEffect(() => {
    const sm = new IntegrityStateMachine(config, {
      onStateChange: (payload) => {
        setStatus(payload);
        if (onStateChange) onStateChange(payload);
      },
      onViolation: (event) => {
        if (onViolation) onViolation(event);
      }
    });

    const engine = new IntegrityDetectorEngine(sm, config, customDetector);

    stateMachineRef.current = sm;
    detectorEngineRef.current = engine;

    const targetEl = targetContainerRef?.current || (typeof window !== 'undefined' ? window : null);
    if (targetEl) {
      engine.bindDomListeners(targetEl);
    }

    return () => {
      engine.stop();
      if (targetEl) {
        engine.unbindDomListeners(targetEl);
      }
    };
  }, []);

  const start = useCallback((stream?: MediaStream, videoEl?: HTMLVideoElement) => {
    if (!detectorEngineRef.current) return;
    if (stream) {
      detectorEngineRef.current.attachStream(stream, videoEl);
    }
    detectorEngineRef.current.start();
  }, []);

  const stop = useCallback(() => {
    if (detectorEngineRef.current) {
      detectorEngineRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (detectorEngineRef.current) {
      detectorEngineRef.current.stop();
    }
    if (stateMachineRef.current) {
      stateMachineRef.current.reset();
    }
  }, []);

  return {
    state: status.state,
    score: status.score,
    activeViolations: status.activeViolations,
    history: status.history,
    lastUpdated: status.lastUpdated,
    start,
    stop,
    reset,
    engine: detectorEngineRef.current,
    stateMachine: stateMachineRef.current
  };
}
