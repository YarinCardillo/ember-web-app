/**
 * AmpRack - Main container with stage components, preset selector, power button
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Header } from './Header';
import { Credits } from './Credits';
import { InputStage } from '../stages/InputStage';
import { ToneStage } from '../stages/ToneStage';
import { SaturationStage } from '../stages/SaturationStage';
import { OutputStage } from '../stages/OutputStage';
import { useAudioStore } from '../../store/useAudioStore';
import AudioEngine from '../../audio/AudioEngine';
import { InputNode } from '../../audio/nodes/InputNode';
import { TapeSimNode } from '../../audio/nodes/TapeSimNode';
import { ToneStackNode } from '../../audio/nodes/ToneStackNode';
import { TubeSaturationNode } from '../../audio/nodes/TubeSaturationNode';
import { TransientNode } from '../../audio/nodes/TransientNode';
import { SpeakerSimNode } from '../../audio/nodes/SpeakerSimNode';
import { OutputNode } from '../../audio/nodes/OutputNode';
// import { TransientDebug } from '../ui/TransientDebug'; // Debug panel - uncomment if needed
import { isMobileDevice } from '../../utils/device-detection';
import presetsData from '../../audio/presets/amp-presets.json';
import type { PresetCollection } from '../../types/audio.types';

interface AudioNodes {
  input: InputNode | null;
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

export function AmpRack({ onHelpClick }: AmpRackProps): JSX.Element {
  // Detect mobile once on mount (user agent doesn't change during session)
  const isMobile = useMemo(() => isMobileDevice(), []);
  
  const [inputDevices, setInputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [outputDevices, setOutputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [isOutputDeviceSupported, setIsOutputDeviceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioNodesRef = useRef<AudioNodes>({
    input: null,
    tapeSim: null,
    toneStack: null,
    saturation: null,
    transient: null,
    speakerSim: null,
    output: null,
  });

  const [audioNodes, setAudioNodes] = useState<AudioNodes>(audioNodesRef.current);

  const isRunning = useAudioStore((state) => state.isRunning);
  const isInitialized = useAudioStore((state) => state.isInitialized);
  const setInitialized = useAudioStore((state) => state.setInitialized);
  const setRunning = useAudioStore((state) => state.setRunning);
  const bypassAll = useAudioStore((state) => state.bypassAll);

  // Initialize audio engine and create nodes
  const initializeAudio = useCallback(async (): Promise<AudioNodes> => {
    try {
      console.log('Initializing audio engine...');
      const engine = AudioEngine.getInstance();
      await engine.initialize();
      const ctx = engine.getContext();
      console.log('AudioContext created, state:', ctx.state);

      // Apply stored output device if one was selected before initialization
      const storedOutputDeviceId = useAudioStore.getState().outputDeviceId;
      if (storedOutputDeviceId) {
        console.log('Applying stored output device:', storedOutputDeviceId);
        await engine.setOutputDevice(storedOutputDeviceId);
      }

      const nodes: AudioNodes = {
        input: new InputNode(ctx),
        tapeSim: new TapeSimNode(ctx),
        toneStack: new ToneStackNode(ctx),
        saturation: new TubeSaturationNode(ctx),
        transient: new TransientNode(ctx),
        speakerSim: new SpeakerSimNode(ctx),
        output: new OutputNode(ctx),
      };

      // Initialize worklets
      console.log('Initializing saturation worklet...');
      await nodes.saturation!.initialize();
      
      console.log('Initializing tape simulation...');
      await nodes.tapeSim!.initialize();
      
      console.log('Initializing transient shaper...');
      await nodes.transient!.initialize();
      
      // Sync bypass state from store
      const bypassTapeSim = useAudioStore.getState().bypassTapeSim;
      nodes.tapeSim!.setBypass(bypassTapeSim);

      // Connect signal chain using getInput() for proper node connections
      // Input -> TapeSim
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

      console.log('Signal chain connected');

      audioNodesRef.current = nodes;
      setAudioNodes(nodes);
      setInitialized(true);
      
      return nodes;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      setError('Failed to initialize audio engine');
      throw err;
    }
  }, [setInitialized]);

  // Start audio processing
  const startAudio = useCallback(async (nodes: AudioNodes) => {
    if (!nodes.input) {
      console.error('No input node available');
      return;
    }

    try {
      console.log('Requesting audio input...');
      const deviceId = useAudioStore.getState().inputDeviceId || undefined;
      
      await nodes.input.setInput(deviceId);
      console.log('Audio input started');
      
      // Start keep-alive to prevent background throttling
      const engine = AudioEngine.getInstance();
      engine.startKeepAlive();
      
      setRunning(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start audio:', err);
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Microphone permission denied. Please allow access in your browser settings.');
            break;
          case 'NotFoundError':
            setError('No audio input device found. Please connect a microphone or virtual audio cable.');
            break;
          case 'NotReadableError':
            setError('Audio device is in use by another application.');
            break;
          default:
            setError(`Audio error: ${err.message}`);
        }
      } else {
        setError('Failed to start audio');
      }
    }
  }, [setRunning]);

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
        await startAudio(nodes);
      } catch (err) {
        console.error('Power toggle failed:', err);
      }
    } else if (isRunning) {
      stopAudio();
    } else {
      await startAudio(audioNodesRef.current);
    }
  }, [isInitialized, isRunning, initializeAudio, startAudio, stopAudio]);

  // Subscribe to all audio parameters
  const inputGain = useAudioStore((state) => state.inputGain);
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const drive = useAudioStore((state) => state.drive);
  const harmonics = useAudioStore((state) => state.harmonics);
  const saturationMix = useAudioStore((state) => state.saturationMix);
  const bypassSaturation = useAudioStore((state) => state.bypassSaturation);
  const transientAttack = useAudioStore((state) => state.transientAttack);
  const transientSustain = useAudioStore((state) => state.transientSustain);
  const transientMix = useAudioStore((state) => state.transientMix);
  const preGain = useAudioStore((state) => state.preGain);
  const outputGain = useAudioStore((state) => state.outputGain);

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
    if (!isInitialized || !nodes.input || !nodes.output) return;

    if (bypassAll) {
      // Disconnect ALL nodes to prevent any signal bleeding
      nodes.input.getOutput().disconnect();
      nodes.tapeSim?.disconnect();
      nodes.toneStack?.disconnect();
      nodes.saturation?.disconnect();
      nodes.transient?.disconnect();
      nodes.speakerSim?.disconnect();
      
      // BYPASS: Connect input directly to master gain (skip all processing but keep volume control)
      // This skips clipper and all DSP, but master volume still works
      nodes.input.getOutput().connect(nodes.output.getMasterGainNode());
      
      console.log('Master bypass ENABLED - dry signal through master gain');
    } else {
      // Disconnect bypass route
      nodes.input.getOutput().disconnect();
      
      // Restore internal routing for saturation and transient (may have been broken by disconnect)
      nodes.saturation?.restoreRouting();
      nodes.transient?.restoreRouting();
      
      // Reconnect normal signal chain
      nodes.input.connect(nodes.tapeSim!.getInput());
      nodes.tapeSim!.connect(nodes.toneStack!.getInput());
      nodes.toneStack!.connect(nodes.saturation!.inputGain);
      nodes.saturation!.connect(nodes.transient!.inputGain);
      nodes.transient!.connect(nodes.speakerSim!.getInput());
      nodes.speakerSim!.connect(nodes.output.getInput());
      
      console.log('Master bypass DISABLED - processing active');
    }
  }, [isInitialized, bypassAll]);

  // Handle tape sim bypass state
  const bypassTapeSim = useAudioStore((state) => state.bypassTapeSim);
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.tapeSim || !nodes.input || !nodes.toneStack) return;

    // Update bypass state in TapeSimNode FIRST
    nodes.tapeSim.setBypass(bypassTapeSim);
    
    // The TapeSimNode handles internal routing via getInput(),
    // so we need to reconnect the signal chain when bypass state changes
    if (!bypassAll) {
      // Disconnect current connections
      nodes.input.getOutput().disconnect();
      nodes.tapeSim.disconnect();
      
      // Reconnect with updated routing (getInput() will return correct node based on bypass state)
      nodes.input.connect(nodes.tapeSim.getInput());
      nodes.tapeSim.connect(nodes.toneStack.getInput());
      
      console.log(`Tape sim ${bypassTapeSim ? 'bypassed' : 'active'}`);
    }
  }, [isInitialized, bypassTapeSim, bypassAll]);

  // Handle input device change
  const handleInputDeviceChange = useCallback(
    async (deviceId: string) => {
      if (audioNodesRef.current.input) {
        try {
          await audioNodesRef.current.input.setInput(deviceId);
        } catch (err) {
          console.error('Failed to change input device:', err);
          setError('Failed to change audio input device');
        }
      }
    },
    []
  );

  // Handle output device change
  const handleOutputDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        const engine = AudioEngine.getInstance();
        const success = await engine.setOutputDevice(deviceId);
        if (!success) {
          setError('Failed to change output device');
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
        console.error('Failed to change output device:', err);
        setError('Failed to change audio output device');
      }
    },
    []
  );

  // Enumerate devices (refreshes after initialization when we have permission)
  useEffect(() => {
    const refreshDevices = async (): Promise<void> => {
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
        console.error('Failed to enumerate devices:', err);
      }
    };
    refreshDevices();

    // Also listen for device changes
    const handleDeviceChange = (): void => {
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isInitialized]);

  const presets = presetsData as PresetCollection;

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8 select-none">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Notice - shown only on actual mobile devices */}
        {isMobile && (
          <div className="mb-4 p-3 bg-ember-orange/20 border border-ember-orange/40 rounded-lg text-center">
            <p className="text-sm text-ember-orange">
              Ember Amp is designed for desktop browsers with virtual audio cables.
            </p>
          </div>
        )}

        {/* Header */}
        <Header presets={presets} onPowerToggle={handlePowerToggle} onHelpClick={onHelpClick} />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
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
            />
            <ToneStage />
            <SaturationStage />
          </div>

          {/* Bottom Row: Output (1 column width) + Credits (2 columns width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
            <OutputStage
              preClipperAnalyser={audioNodes.output?.getPreClipperAnalyser() || null}
              postGainAnalyser={audioNodes.output?.getPostGainAnalyser() || null}
              outputDevices={outputDevices}
              onOutputDeviceChange={handleOutputDeviceChange}
              isOutputDeviceSupported={isOutputDeviceSupported}
            />
            <div className="md:col-span-2">
              <Credits />
            </div>
          </div>
        </div>
      </div>
      
      {/* Debug UI - Temporary for parameter tuning */}
      {/* <TransientDebug /> */}
    </div>
  );
}
