/**
 * AmpRack - Main container with stage components, preset selector, power button
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Credits } from "./Credits";
import { InputStage } from "../stages/InputStage";
import { ToneStage } from "../stages/ToneStage";
import { SaturationStage } from "../stages/SaturationStage";
import { OutputStage } from "../stages/OutputStage";
import { useAudioStore } from "../../store/useAudioStore";
import AudioEngine from "../../audio/AudioEngine";
import { InputNode } from "../../audio/nodes/InputNode";
import { VinylModeNode } from "../../audio/nodes/VinylModeNode";
import { TapeSimNode } from "../../audio/nodes/TapeSimNode";
import { ToneStackNode } from "../../audio/nodes/ToneStackNode";
import { TubeSaturationNode } from "../../audio/nodes/TubeSaturationNode";
import { TransientNode } from "../../audio/nodes/TransientNode";
import { SpeakerSimNode } from "../../audio/nodes/SpeakerSimNode";
import { OutputNode } from "../../audio/nodes/OutputNode";
import { useVinylMode } from "../../hooks/useVinylMode";
// import { TransientDebug } from '../ui/TransientDebug'; // Debug panel - uncomment if needed
import { isMobileDevice } from "../../utils/device-detection";
import presetsData from "../../audio/presets/amp-presets.json";
import type { PresetCollection } from "../../types/audio.types";
import { SafetyWarningModal } from "./SafetyWarningModal";

interface AudioNodes {
  input: InputNode | null;
  vinylMode: VinylModeNode | null;
  tapeSim: TapeSimNode | null;
  toneStack: ToneStackNode | null;
  saturation: TubeSaturationNode | null;
  transient: TransientNode | null;
  speakerSim: SpeakerSimNode | null;
  output: OutputNode | null;
}

interface AmpRackProps {
  onHelpClick?: () => void;
}

// Helper to check if a device looks like a physical microphone
const isMicrophoneDevice = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();

  // Whitelist - definitely safe (virtual cables)
  const safeKeywords = [
    "virtual",
    "cable",
    "blackhole",
    "vb-",
    "monitor",
    "loopback",
    "audio_proxy",
  ];
  if (safeKeywords.some((keyword) => lowerLabel.includes(keyword))) {
    return false;
  }

  // Blacklist - suspicious (likely microphones)
  const suspiciousKeywords = [
    "microphone",
    "mic",
    "built-in input",
    "internal",
    "webcam",
    "capture",
  ];
  if (suspiciousKeywords.some((keyword) => lowerLabel.includes(keyword))) {
    return true;
  }

  return false;
};

export function AmpRack({ onHelpClick }: AmpRackProps): JSX.Element {
  // Detect mobile once on mount (user agent doesn't change during session)
  const isMobile = useMemo(() => isMobileDevice(), []);

  const [inputDevices, setInputDevices] = useState<
    Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>
  >([]);
  const [outputDevices, setOutputDevices] = useState<
    Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>
  >([]);
  const [isOutputDeviceSupported, setIsOutputDeviceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safety Warning Modal State
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [pendingDeviceLabel, setPendingDeviceLabel] = useState<string>("");

  // Preview audio state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewBufferRef = useRef<AudioBuffer | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);

  const audioNodesRef = useRef<AudioNodes>({
    input: null,
    vinylMode: null,
    tapeSim: null,
    toneStack: null,
    saturation: null,
    transient: null,
    speakerSim: null,
    output: null,
  });

  const [audioNodes, setAudioNodes] = useState<AudioNodes>(
    audioNodesRef.current,
  );

  const isRunning = useAudioStore((state) => state.isRunning);
  const isInitialized = useAudioStore((state) => state.isInitialized);
  const setInitialized = useAudioStore((state) => state.setInitialized);
  const setRunning = useAudioStore((state) => state.setRunning);
  const bypassAll = useAudioStore((state) => state.bypassAll);

  // Initialize audio engine and create nodes
  const initializeAudio = useCallback(async (): Promise<AudioNodes> => {
    try {
      console.log("Initializing audio engine...");
      const engine = AudioEngine.getInstance();
      await engine.initialize();
      const ctx = engine.getContext();
      console.log("AudioContext created, state:", ctx.state);

      // Apply stored output device if one was selected before initialization
      const storedOutputDeviceId = useAudioStore.getState().outputDeviceId;
      if (storedOutputDeviceId) {
        console.log("Applying stored output device:", storedOutputDeviceId);
        await engine.setOutputDevice(storedOutputDeviceId);
      }

      const nodes: AudioNodes = {
        input: new InputNode(ctx),
        vinylMode: new VinylModeNode(ctx),
        tapeSim: new TapeSimNode(ctx),
        toneStack: new ToneStackNode(ctx),
        saturation: new TubeSaturationNode(ctx),
        transient: new TransientNode(ctx),
        speakerSim: new SpeakerSimNode(ctx),
        output: new OutputNode(ctx),
      };

      // Initialize worklets
      console.log("Initializing vinyl mode...");
      await nodes.vinylMode!.initialize();

      console.log("Initializing saturation worklet...");
      await nodes.saturation!.initialize();

      console.log("Initializing tape simulation...");
      await nodes.tapeSim!.initialize();

      console.log("Initializing transient shaper...");
      await nodes.transient!.initialize();

      // Sync bypass state from store
      const bypassTapeSim = useAudioStore.getState().bypassTapeSim;
      nodes.tapeSim!.setBypass(bypassTapeSim);

      // Vinyl mode starts bypassed (inactive)
      nodes.vinylMode!.setBypass(true);

      // Connect signal chain with vinyl mode FIRST, before input gain
      // Raw MediaStream -> VinylMode -> InputGain -> Analyser -> TapeSim -> ...
      // This ensures vinyl processing happens on the cleanest possible signal

      // Note: We'll connect the raw media stream when audio starts
      // For now, just set up the vinyl mode -> input gain connection
      nodes.vinylMode!.connect(nodes.input!.getGainInput());

      // Input (after gain) -> TapeSim
      nodes.input!.connect(nodes.tapeSim!.getInput());

      // TapeSim -> ToneStack (no preamp - it was just a passthrough)
      nodes.tapeSim!.connect(nodes.toneStack!.getInput());

      // ToneStack -> Saturation
      nodes.toneStack!.connect(nodes.saturation!.inputGain);

      // Saturation -> Transient
      nodes.saturation!.connect(nodes.transient!.inputGain);

      // Transient -> SpeakerSim
      nodes.transient!.connect(nodes.speakerSim!.getInput());

      // SpeakerSim -> Output (includes analog soft clipper)
      nodes.speakerSim!.connect(nodes.output!.getInput());

      console.log(
        "Signal chain connected (Vinyl Mode -> Input Gain -> Processing)",
      );

      audioNodesRef.current = nodes;
      setAudioNodes(nodes);
      setInitialized(true);

      return nodes;
    } catch (err) {
      console.error("Failed to initialize audio:", err);
      setError("Failed to initialize audio engine");
      throw err;
    }
  }, [setInitialized]);

  // Start audio processing
  const startAudio = useCallback(
    async (nodes: AudioNodes, mobileMode: boolean = false) => {
      if (!nodes.vinylMode) {
        console.error("No vinyl mode node available");
        return;
      }

      try {
        // On mobile, skip mic permissions - only preview mode is available
        if (mobileMode) {
          console.log("Starting in mobile preview-only mode (no mic)");
          // Start keep-alive to prevent background throttling
          const engine = AudioEngine.getInstance();
          engine.startKeepAlive();
          setRunning(true);
          setError(null);
          return;
        }

        if (!nodes.input) {
          console.error("No input node available");
          return;
        }

        // Check if an input device is selected
        const deviceId = useAudioStore.getState().inputDeviceId;

        if (!deviceId) {
          // No input device selected - start in preview-only mode to avoid feedback
          console.log(
            "No input device selected - starting in preview-only mode",
          );
          const engine = AudioEngine.getInstance();
          engine.startKeepAlive();
          setRunning(true);
          setError(null);
          return;
        }

        console.log("Requesting audio input...");
        await nodes.input.setInput(deviceId);

        // Connect raw media stream to vinyl mode (first in chain)
        nodes.input.connectRawSource(nodes.vinylMode!.getInput());

        console.log("Audio input started with vinyl mode as first processor");

        // Start keep-alive to prevent background throttling
        const engine = AudioEngine.getInstance();
        engine.startKeepAlive();

        setRunning(true);
        setError(null);
      } catch (err) {
        console.error("Failed to start audio:", err);
        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
              setError(
                "Microphone permission denied. Please allow access in your browser settings.",
              );
              break;
            case "NotFoundError":
              setError(
                "No audio input device found. Please connect a microphone or virtual audio cable.",
              );
              break;
            case "NotReadableError":
              setError("Audio device is in use by another application.");
              break;
            default:
              setError(`Audio error: ${err.message}`);
          }
        } else {
          setError("Failed to start audio");
        }
      }
    },
    [setRunning],
  );

  // Stop audio processing
  const stopAudio = useCallback(() => {
    if (audioNodesRef.current.input) {
      audioNodesRef.current.input.disconnect();
    }

    // Stop keep-alive
    const engine = AudioEngine.getInstance();
    engine.stopKeepAlive();

    setRunning(false);
  }, [setRunning]);

  // Handle power button
  const handlePowerToggle = useCallback(async () => {
    setError(null);

    if (!isInitialized) {
      try {
        const nodes = await initializeAudio();
        await startAudio(nodes, isMobile);
      } catch (err) {
        console.error("Power toggle failed:", err);
      }
    } else if (isRunning) {
      stopAudio();
    } else {
      await startAudio(audioNodesRef.current, isMobile);
    }
  }, [
    isInitialized,
    isRunning,
    isMobile,
    initializeAudio,
    startAudio,
    stopAudio,
  ]);

  // Subscribe to audio parameters with grouped selector to reduce re-renders
  const audioParams = useAudioStore(
    useShallow((state) => ({
      inputGain: state.inputGain,
      bass: state.bass,
      mid: state.mid,
      treble: state.treble,
      presence: state.presence,
      drive: state.drive,
      harmonics: state.harmonics,
      saturationMix: state.saturationMix,
      bypassSaturation: state.bypassSaturation,
      transientAttack: state.transientAttack,
      transientSustain: state.transientSustain,
      transientMix: state.transientMix,
      preGain: state.preGain,
      outputGain: state.outputGain,
      inputDeviceId: state.inputDeviceId,
    })),
  );

  const {
    inputGain,
    bass,
    mid,
    treble,
    presence,
    drive,
    harmonics,
    saturationMix,
    bypassSaturation,
    transientAttack,
    transientSustain,
    transientMix,
    preGain,
    outputGain,
    inputDeviceId: currentInputDeviceId,
  } = audioParams;

  // Check if current input is dangerous (for consistent badge display)
  const isInputDangerous = useMemo(() => {
    if (!currentInputDeviceId) return false;
    const device = inputDevices.find(
      (d) => d.deviceId === currentInputDeviceId,
    );
    return device ? isMicrophoneDevice(device.label) : false;
  }, [currentInputDeviceId, inputDevices]);

  // Update audio nodes when parameters change
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized) return;

    if (nodes.input) {
      nodes.input.setGain(inputGain);
    }
    if (nodes.toneStack) {
      nodes.toneStack.setBass(bass);
      nodes.toneStack.setMid(mid);
      nodes.toneStack.setTreble(treble);
      nodes.toneStack.setPresence(presence);
    }
    if (nodes.saturation) {
      nodes.saturation.setDrive(drive);
      nodes.saturation.setHarmonics(harmonics);
      nodes.saturation.setMix(saturationMix);
      nodes.saturation.setBypass(bypassSaturation);
    }
    if (nodes.transient) {
      nodes.transient.setAttack(transientAttack);
      nodes.transient.setSustain(transientSustain);
      nodes.transient.setMix(transientMix);
    }
    if (nodes.output) {
      nodes.output.setPreGain(preGain);
      nodes.output.setGain(outputGain);
    }
  }, [
    isInitialized,
    inputGain,
    bass,
    mid,
    treble,
    presence,
    drive,
    harmonics,
    saturationMix,
    bypassSaturation,
    transientAttack,
    transientSustain,
    transientMix,
    preGain,
    outputGain,
  ]);

  // Handle master bypass - reroute signal chain
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.input || !nodes.output || !nodes.vinylMode)
      return;

    if (bypassAll) {
      // Disconnect ALL nodes to prevent any signal bleeding
      nodes.vinylMode.disconnect();
      nodes.input.getOutput().disconnect();
      nodes.tapeSim?.disconnect();
      nodes.toneStack?.disconnect();
      nodes.saturation?.disconnect();
      nodes.transient?.disconnect();
      nodes.speakerSim?.disconnect();

      // BYPASS: Connect input directly to master gain (skip all processing but keep volume control)
      // Signal path in bypass: MediaStream -> VinylMode (bypassed) -> Input Gain -> Master Gain
      // We keep vinyl mode in the chain but bypassed so we don't break connections
      nodes.vinylMode.connect(nodes.input.getGainInput());
      nodes.input.getOutput().connect(nodes.output.getMasterGainNode());

      console.log("Master bypass ENABLED - dry signal through master gain");
    } else {
      // Disconnect bypass route
      nodes.input.getOutput().disconnect();
      nodes.vinylMode.disconnect();

      // Restore internal routing for saturation and transient (may have been broken by disconnect)
      nodes.saturation?.restoreRouting();
      nodes.transient?.restoreRouting();
      nodes.vinylMode?.restoreRouting();

      // Reconnect normal signal chain (vinyl mode first, then input gain, then rest)
      nodes.vinylMode.connect(nodes.input.getGainInput());
      nodes.input.connect(nodes.tapeSim!.getInput());
      nodes.tapeSim!.connect(nodes.toneStack!.getInput());
      nodes.toneStack!.connect(nodes.saturation!.inputGain);
      nodes.saturation!.connect(nodes.transient!.inputGain);
      nodes.transient!.connect(nodes.speakerSim!.getInput());
      nodes.speakerSim!.connect(nodes.output.getInput());

      console.log("Master bypass DISABLED - processing active");
    }
  }, [isInitialized, bypassAll]);

  // Handle tone stack (EQ) bypass state
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.toneStack) return;

    nodes.toneStack.setBypass(bypassToneStack);
    console.log(`EQ ${bypassToneStack ? "bypassed" : "active"}`);
  }, [isInitialized, bypassToneStack]);

  // Handle tape sim bypass state
  const bypassTapeSim = useAudioStore((state) => state.bypassTapeSim);
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.tapeSim || !nodes.input || !nodes.toneStack)
      return;

    // Update bypass state in TapeSimNode FIRST
    nodes.tapeSim.setBypass(bypassTapeSim);

    // The TapeSimNode handles internal routing via getInput(),
    // so we need to reconnect the signal chain when bypass state changes
    if (!bypassAll) {
      // Disconnect output only (does NOT stop MediaStream - that would kill audio!)
      nodes.input.disconnectOutput();
      nodes.tapeSim.disconnect();

      // Reconnect with updated routing (getInput() will return correct node based on bypass state)
      nodes.input.connect(nodes.tapeSim.getInput());
      nodes.tapeSim.connect(nodes.toneStack.getInput());

      console.log(`Tape sim ${bypassTapeSim ? "bypassed" : "active"}`);
    }
  }, [isInitialized, bypassTapeSim, bypassAll]);

  // Vinyl mode state and callbacks
  const vinylMode = useAudioStore((state) => state.vinylMode);

  // Wire up vinyl mode hook with audio callbacks
  const vinylModeHook = useVinylMode(
    {},
    {
      onRampReverb: (wet) => {
        const nodes = audioNodesRef.current;
        if (nodes.vinylMode) {
          nodes.vinylMode.rampReverbMix(wet, 1500);
        }
      },
      onRampIntensity: (intensity) => {
        const nodes = audioNodesRef.current;
        if (nodes.vinylMode) {
          nodes.vinylMode.rampIntensity(intensity, 1500);
        }
      },
      onSetIntensity: (intensity) => {
        const nodes = audioNodesRef.current;
        if (nodes.vinylMode) {
          nodes.vinylMode.setIntensity(intensity);
        }
      },
      onFlushBuffer: () => {
        const nodes = audioNodesRef.current;
        if (nodes.vinylMode) {
          nodes.vinylMode.flushBuffer();
        }
      },
    },
  );

  // Handle vinyl mode state changes
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.vinylMode) return;

    // Update bypass state based on vinyl mode state
    const shouldBypass = vinylMode.state === "idle";
    nodes.vinylMode.setBypass(shouldBypass);

    // Reconnect signal chain if needed (when not in master bypass)
    if (!bypassAll) {
      nodes.vinylMode.restoreRouting();
    }
  }, [isInitialized, vinylMode.state, bypassAll]);

  // Handle vinyl mode activation/deactivation
  const handleVinylModeActivate = useCallback(() => {
    vinylModeHook.activate();
  }, [vinylModeHook]);

  const handleVinylModeDeactivate = useCallback(() => {
    vinylModeHook.deactivate();
  }, [vinylModeHook]);

  // Handle vinyl intensity slider change
  const handleVinylIntensityChange = useCallback(
    (intensity: number) => {
      vinylModeHook.updateIntensity(intensity);
    },
    [vinylModeHook],
  );

  // Handle confirmed input device change
  const applyInputDeviceChange = useCallback(async (deviceId: string) => {
    if (audioNodesRef.current.input && audioNodesRef.current.vinylMode) {
      try {
        await audioNodesRef.current.input.setInput(deviceId);
        // Reconnect raw source to vinyl mode after device change
        audioNodesRef.current.input.connectRawSource(
          audioNodesRef.current.vinylMode.getInput(),
        );

        // Clear error if success
        setError(null);
      } catch (err) {
        console.error("Failed to change input device:", err);
        setError("Failed to change audio input device");
      }
    }
  }, []);

  // Handle input device change request
  const handleInputDeviceChange = useCallback(
    async (deviceId: string) => {
      // Find the device label
      const device = inputDevices.find((d) => d.deviceId === deviceId);
      const label = device?.label || "Unknown Device";

      // Check if it's a suspicious device (microphone)
      if (isMicrophoneDevice(label)) {
        setPendingDeviceId(deviceId);
        setPendingDeviceLabel(label);
        setShowSafetyModal(true);
        return;
      }

      // If safe, apply immediately and update store
      useAudioStore.getState().setInputDevice(deviceId);
      applyInputDeviceChange(deviceId);
    },
    [inputDevices, applyInputDeviceChange],
  );

  const handleSafetyConfirm = useCallback(() => {
    if (pendingDeviceId) {
      useAudioStore.getState().setInputDevice(pendingDeviceId);
      applyInputDeviceChange(pendingDeviceId);
    }
    setShowSafetyModal(false);
    setPendingDeviceId(null);
  }, [pendingDeviceId, applyInputDeviceChange]);

  const handleSafetyCancel = useCallback(() => {
    setShowSafetyModal(false);
    setPendingDeviceId(null);
    // Don't need to reset store, as we haven't updated it yet!
    // The previous selection remains active.
  }, []);

  // Handle output device change
  const handleOutputDeviceChange = useCallback(async (deviceId: string) => {
    try {
      const engine = AudioEngine.getInstance();

      // If engine isn't initialized yet, the device selection is stored in the
      // store and will be applied when the amp powers on. No error needed.
      if (!engine.getInitialized()) {
        console.log(
          "Output device selection stored, will apply on power-on:",
          deviceId,
        );
        return;
      }

      const success = await engine.setOutputDevice(deviceId);
      if (!success) {
        setError("Failed to change output device");
      } else {
        // Reconnect output node to destination after sinkId change
        // This ensures audio routes to the new output device in PWA context
        const outputNode = audioNodesRef.current.output;
        if (outputNode) {
          const ctx = engine.getContext();
          outputNode.reconnectToDestination(ctx);
        }
      }
    } catch (err) {
      console.error("Failed to change output device:", err);
      setError("Failed to change audio output device");
    }
  }, []);

  // Preview audio: load and play demo file through signal chain
  const previewAbortRef = useRef<AbortController | null>(null);

  const loadPreviewBuffer = useCallback(
    async (signal?: AbortSignal): Promise<AudioBuffer | null> => {
      if (previewBufferRef.current) return previewBufferRef.current;

      try {
        const engine = AudioEngine.getInstance();
        const ctx = engine.getContext();
        const response = await fetch("/audio/assumptions.mp3", { signal });
        if (!response.ok) throw new Error("Failed to fetch preview audio");
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        previewBufferRef.current = audioBuffer;
        return audioBuffer;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }
        console.error("Failed to load preview audio:", err);
        return null;
      }
    },
    [],
  );

  const stopPreview = useCallback(() => {
    // Abort any pending fetch
    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
      previewAbortRef.current = null;
    }
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch {
        // Ignore errors when stopping preview
      }
      previewSourceRef.current = null;
    }
    if (previewGainRef.current) {
      previewGainRef.current.disconnect();
      previewGainRef.current = null;
    }
    // Unmute input signal when preview stops
    if (audioNodesRef.current.input) {
      audioNodesRef.current.input.unmuteInput();
    }
    setIsPreviewPlaying(false);
  }, []);

  const togglePreview = useCallback(async () => {
    if (isPreviewPlaying) {
      stopPreview();
      return;
    }

    if (!audioNodesRef.current.vinylMode) {
      setError("Audio engine not initialized");
      return;
    }

    // Create abort controller for this fetch
    previewAbortRef.current = new AbortController();

    setIsPreviewLoading(true);
    try {
      const buffer = await loadPreviewBuffer(previewAbortRef.current.signal);
      if (!buffer) {
        // Aborted or failed - don't show error for aborts
        if (!previewAbortRef.current?.signal.aborted) {
          setError("Failed to load preview audio");
        }
        setIsPreviewLoading(false);
        return;
      }

      const engine = AudioEngine.getInstance();
      const ctx = engine.getContext();

      // Create source and gain nodes
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      // Connect: source → gain → vinylMode input
      source.connect(gain);
      gain.connect(audioNodesRef.current.vinylMode!.getInput());

      // Store refs for cleanup
      previewSourceRef.current = source;
      previewGainRef.current = gain;

      // Mute input signal while preview is playing
      if (audioNodesRef.current.input) {
        audioNodesRef.current.input.muteInput();
      }

      // Ensure AudioContext is active before starting playback
      await engine.resume();

      // Start playback
      source.start();
      setIsPreviewPlaying(true);
      setIsPreviewLoading(false);

      console.log("[Preview] Started playing through signal chain");
    } catch (err) {
      console.error("Failed to start preview:", err);
      setError("Failed to start preview");
      setIsPreviewLoading(false);
    }
  }, [isPreviewPlaying, loadPreviewBuffer, stopPreview]);

  // Stop preview when audio engine stops
  useEffect(() => {
    if (!isRunning && isPreviewPlaying) {
      stopPreview();
    }
  }, [isRunning, isPreviewPlaying, stopPreview]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enumerate devices (refreshes after initialization when we have permission)
  useEffect(() => {
    const refreshDevices = async (): Promise<void> => {
      // Skip device enumeration on mobile - they can't select devices anyway
      if (isMobile) {
        return;
      }

      try {
        const engine = AudioEngine.getInstance();

        // Request permission first to get device labels
        if (isInitialized && !engine.getHasPermission()) {
          await engine.requestPermission();
        }

        const inputList = await engine.enumerateInputDevices();
        const outputList = await engine.enumerateOutputDevices();
        setInputDevices(inputList);
        setOutputDevices(outputList);
        setIsOutputDeviceSupported(engine.isOutputDeviceSupported());
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };
    refreshDevices();

    // Also listen for device changes
    const handleDeviceChange = async (): Promise<void> => {
      // On mobile, device changes (e.g., plugging headphones) can suspend AudioContext
      // Resume it to keep preview working
      if (isMobile && isRunning) {
        try {
          const engine = AudioEngine.getInstance();
          await engine.resume();
          console.log("Resumed AudioContext after device change (mobile)");
        } catch (err) {
          console.error("Failed to resume AudioContext:", err);
        }
      }
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [isInitialized, isMobile, isRunning]);

  const presets = presetsData as PresetCollection;

  return (
    <div className="min-h-screen bg-bg-primary p-4 md:p-8 pb-32 select-none">
      <div className="max-w-[1800px] mx-auto">
        {/* Mobile Notice - shown only on actual mobile devices */}
        {isMobile && (
          <div className="mb-4 p-3 bg-accent-primary/15 border border-accent-primary/30 rounded-xl text-center">
            <p className="text-sm text-accent-primary">
              Ember Amp is designed for desktop browsers with virtual audio
              cables.
            </p>
            <p className="text-xs text-accent-bright/80 mt-1">
              Power on and tap <strong>Preview</strong> to hear how the amp
              sounds!
            </p>
          </div>
        )}

        {/* Header */}
        <Header
          presets={presets}
          onPowerToggle={handlePowerToggle}
          onHelpClick={onHelpClick}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-meter-red/15 border border-meter-red/30 rounded-xl text-meter-red">
            {error}
          </div>
        )}

        {/* Signal Chain */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Top Row: 3 columns - Input, Tone Stack, Saturation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
            <InputStage
              devices={inputDevices}
              inputAnalyser={audioNodes.input?.getAnalyser() || null}
              onDeviceChange={handleInputDeviceChange}
              onVinylModeActivate={handleVinylModeActivate}
              onVinylModeDeactivate={handleVinylModeDeactivate}
              onVinylIntensityChange={handleVinylIntensityChange}
              isPreviewPlaying={isPreviewPlaying}
              isPreviewLoading={isPreviewLoading}
              onPreviewToggle={togglePreview}
              isMobileMode={isMobile}
              isDangerous={isInputDangerous}
            />
            <ToneStage />
            <SaturationStage />
          </div>

          {/* Bottom Row: Output (1 column width) + Credits (2 columns width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
            <OutputStage
              preClipperAnalyser={
                audioNodes.output?.getPreClipperAnalyser() || null
              }
              postGainAnalyser={
                audioNodes.output?.getPostGainAnalyser() || null
              }
              outputDevices={outputDevices}
              onOutputDeviceChange={handleOutputDeviceChange}
              isOutputDeviceSupported={isOutputDeviceSupported}
              isMobileMode={isMobile}
            />
            <div className="md:col-span-2">
              <Credits />
            </div>
          </div>
        </div>
      </div>

      {/* Safety Warning Modal */}
      {showSafetyModal && (
        <SafetyWarningModal
          deviceName={pendingDeviceLabel}
          onCancel={handleSafetyCancel}
          onContinue={handleSafetyConfirm}
        />
      )}

      {/* Debug UI - Temporary for parameter tuning */}
      {/* <TransientDebug /> */}

      {/* Spacer for fixed footer */}
      <div className="h-10" />

      {/* Footer */}
      <Footer />
    </div>
  );
}
