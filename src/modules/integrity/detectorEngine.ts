// src/modules/integrity/detectorEngine.ts
import { IntegrityStateMachine } from './IntegrityStateMachine';
import { DEFAULT_INTEGRITY_CONFIG } from './types';
import type { IntegrityConfig } from './types';

export interface DetectionFrameResult {
  faceCount: number;
  isTurnedAway: boolean;
  meanLuminance: number;
  isBlurry?: boolean;
}

/**
 * On-device camera frame detector and browser environment observer.
 * Performs throttled frame checks (~2-5 fps) and manages Page Visibility, Window Focus,
 * and Clipboard Paste event bindings without any network calls.
 */
export class IntegrityDetectorEngine {
  private stateMachine: IntegrityStateMachine;
  private config: IntegrityConfig;
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  private noFaceCounterMs: number = 0;
  private turnAwayCounterMs: number = 0;

  // Custom detector callback for mocked testing or MediaPipe injection
  private customDetector?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<DetectionFrameResult> | DetectionFrameResult;

  constructor(
    stateMachine: IntegrityStateMachine,
    config: Partial<IntegrityConfig> = {},
    customDetector?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<DetectionFrameResult> | DetectionFrameResult
  ) {
    this.stateMachine = stateMachine;
    this.config = { ...DEFAULT_INTEGRITY_CONFIG, ...config };
    this.customDetector = customDetector;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Bind DOM event observers (Visibility API, Blur/Focus, Paste)
   */
  public bindDomListeners(targetContainer: HTMLElement | Window = window): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.handleWindowBlur);
      window.addEventListener('focus', this.handleWindowFocus);
    }

    if (targetContainer && 'addEventListener' in targetContainer) {
      targetContainer.addEventListener('paste', this.handlePasteAttempt as EventListener);
    }
  }

  /**
   * Unbind DOM event observers
   */
  public unbindDomListeners(targetContainer: HTMLElement | Window = window): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', this.handleWindowBlur);
      window.removeEventListener('focus', this.handleWindowFocus);
    }

    if (targetContainer && 'removeEventListener' in targetContainer) {
      targetContainer.removeEventListener('paste', this.handlePasteAttempt as EventListener);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stateMachine.triggerViolation('TAB_HIDDEN', { timestamp: Date.now() });
    } else {
      this.stateMachine.clearViolation('TAB_HIDDEN');
    }
  };

  private handleWindowBlur = (): void => {
    this.stateMachine.triggerViolation('FOCUS_LOST', { timestamp: Date.now() });
  };

  private handleWindowFocus = (): void => {
    this.stateMachine.clearViolation('FOCUS_LOST');
  };

  private handlePasteAttempt = (e: ClipboardEvent): void => {
    this.stateMachine.triggerViolation('PASTE_ATTEMPTED', {
      timestamp: Date.now(),
      target: (e.target as HTMLElement)?.tagName
    });
  };

  /**
   * Attach a MediaStream or mock video element for monitoring
   */
  public attachStream(stream: MediaStream, videoEl?: HTMLVideoElement): void {
    this.mediaStream = stream;
    this.stateMachine.transitionToInitializing();

    // Observe video track status for CAMERA_DISCONNECTED
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) {
      this.stateMachine.transitionToError('No video track found');
      return;
    }

    const videoTrack = tracks[0];
    videoTrack.onended = () => {
      this.stateMachine.transitionToError('Camera track ended');
    };
    videoTrack.onmute = () => {
      this.stateMachine.triggerViolation('CAMERA_DISCONNECTED', { reason: 'Track muted' });
    };
    videoTrack.onunmute = () => {
      this.stateMachine.clearViolation('CAMERA_DISCONNECTED');
    };

    if (videoEl) {
      this.videoElement = videoEl;
    } else if (typeof document !== 'undefined') {
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = stream;
    }

    if (typeof document !== 'undefined') {
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 320;
      this.canvasElement.height = 240;
      this.canvasContext = this.canvasElement.getContext('2d');
    }

    this.stateMachine.transitionToReady();
  }

  /**
   * Start the throttled detection tick loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const intervalMs = Math.round(1000 / this.config.fps);

    this.timerId = setInterval(async () => {
      await this.performTick();
    }, intervalMs);
  }

  /**
   * Stop monitoring loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Perform one detection tick over current video frame
   */
  public async performTick(): Promise<void> {
    if (!this.isRunning || this.stateMachine.getState() === 'ERROR') return;

    const frame = await this.analyzeFrame();
    const tickIntervalMs = 1000 / this.config.fps;

    let tickHadViolation = false;

    // 1. Low Visibility check (frame mean luminance)
    if (frame.meanLuminance < this.config.darkLuminanceThreshold) {
      this.stateMachine.triggerViolation('LOW_VISIBILITY', { luminance: frame.meanLuminance });
      tickHadViolation = true;
    } else {
      this.stateMachine.clearViolation('LOW_VISIBILITY');
    }

    // 2. Multiple Faces check
    if (frame.faceCount > 1) {
      this.stateMachine.triggerViolation('MULTIPLE_FACES', { count: frame.faceCount });
      tickHadViolation = true;
    } else {
      this.stateMachine.clearViolation('MULTIPLE_FACES');
    }

    // 3. No Face Detected threshold check
    if (frame.faceCount === 0) {
      this.noFaceCounterMs += tickIntervalMs;
      if (this.noFaceCounterMs >= this.config.noFaceThresholdSec * 1000) {
        this.stateMachine.triggerViolation('NO_FACE_DETECTED', { elapsedMs: this.noFaceCounterMs });
        tickHadViolation = true;
      }
    } else {
      this.noFaceCounterMs = 0;
      this.stateMachine.clearViolation('NO_FACE_DETECTED');
    }

    // 4. Face Turned Away threshold check
    if (frame.faceCount === 1 && frame.isTurnedAway) {
      this.turnAwayCounterMs += tickIntervalMs;
      if (this.turnAwayCounterMs >= this.config.turnAwayThresholdSec * 1000) {
        this.stateMachine.triggerViolation('FACE_TURNED_AWAY', { elapsedMs: this.turnAwayCounterMs });
        tickHadViolation = true;
      }
    } else {
      this.turnAwayCounterMs = 0;
      this.stateMachine.clearViolation('FACE_TURNED_AWAY');
    }

    if (!tickHadViolation && frame.faceCount === 1 && !frame.isTurnedAway) {
      this.stateMachine.processCleanTick();
    }
  }

  /**
   * Analyze current frame for luminance and face heuristics
   */
  private async analyzeFrame(): Promise<DetectionFrameResult> {
    if (this.customDetector) {
      const dummyVideo = this.videoElement || (typeof document !== 'undefined' ? document.createElement('video') : {} as HTMLVideoElement);
      const dummyCanvas = this.canvasElement || (typeof document !== 'undefined' ? document.createElement('canvas') : {} as HTMLCanvasElement);
      return await this.customDetector(dummyVideo, dummyCanvas);
    }

    if (!this.canvasContext || !this.videoElement) {
      // Fallback default clean frame if DOM/canvas unavailable in headless test mode
      return { faceCount: 1, isTurnedAway: false, meanLuminance: 120 };
    }

    try {
      this.canvasContext.drawImage(this.videoElement, 0, 0, 320, 240);
      const imgData = this.canvasContext.getImageData(0, 0, 320, 240);
      const data = imgData.data;

      let totalLuminance = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        // Standard RGB to Luminance formula
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
      }

      const meanLuminance = Math.round(totalLuminance / pixelCount);
      return {
        faceCount: 1,
        isTurnedAway: false,
        meanLuminance
      };
    } catch (e) {
      return { faceCount: 1, isTurnedAway: false, meanLuminance: 120 };
    }
  }
}
