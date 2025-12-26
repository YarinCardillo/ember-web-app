/**
 * AmpRack - Main container with stage components, preset selector, power button
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './Header';
import { Credits } from './Credits';
import { InputStage } from '../stages/InputStage';
import { ToneStage } from '../stages/ToneStage';
import { SaturationStage } from '../stages/SaturationStage';
import { OutputStage } from '../stages/OutputStage';
import { useAudioStore } from '../../store/useAudioStore';
import AudioEngine from '../../audio/AudioEngine';
import { InputNode } from '../../audio/nodes/InputNode';
import { PreampNode } from '../../audio/nodes/PreampNode';
import { ToneStackNode } from '../../audio/nodes/ToneStackNode';
import { TubeSaturationNode } from '../../audio/nodes/TubeSaturationNode';
import { SpeakerSimNode } from '../../audio/nodes/SpeakerSimNode';
import { OutputNode } from '../../audio/nodes/OutputNode';
import presetsData from '../../audio/presets/amp-presets.json';
import type { PresetCollection } from '../../types/audio.types';

interface AudioNodes {
  input: InputNode | null;
  preamp: PreampNode | null;
  toneStack: ToneStackNode | null;
  saturation: TubeSaturationNode | null;
  speakerSim: SpeakerSimNode | null;
  output: OutputNode | null;
}

interface AmpRackProps {
  onHelpClick?: () => void;
}

export function AmpRack({ onHelpClick }: AmpRackProps): JSX.Element {
  const [inputDevices, setInputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [outputDevices, setOutputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [isOutputDeviceSupported, setIsOutputDeviceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioNodesRef = useRef<AudioNodes>({
    input: null,
    preamp: null,
    toneStack: null,
    saturation: null,
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
        preamp: new PreampNode(ctx),
        toneStack: new ToneStackNode(ctx),
        saturation: new TubeSaturationNode(ctx),
        speakerSim: new SpeakerSimNode(ctx),
        output: new OutputNode(ctx),
      };

      // Initialize saturation worklet
      console.log('Initializing saturation worklet...');
      await nodes.saturation!.initialize();

      // Connect signal chain using getInput() for proper node connections
      // Input -> Preamp
      nodes.input!.connect(nodes.preamp!.getInput());
      
      // Preamp -> ToneStack
      nodes.preamp!.connect(nodes.toneStack!.getInput());
      
      // ToneStack -> Saturation
      nodes.toneStack!.connect(nodes.saturation!.inputGain);
      
      // Saturation -> SpeakerSim
      nodes.saturation!.connect(nodes.speakerSim!.getInput());
      
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
    if (nodes.output) {
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
    outputGain,
  ]);

  // Handle master bypass - reroute signal chain
  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!isInitialized || !nodes.input || !nodes.output) return;

    const engine = AudioEngine.getInstance();
    const ctx = engine.getContext();

    if (bypassAll) {
      // Disconnect ALL nodes to prevent any signal bleeding
      nodes.input.getOutput().disconnect();
      nodes.preamp?.disconnect();
      nodes.toneStack?.disconnect();
      nodes.saturation?.disconnect();
      nodes.speakerSim?.disconnect();
      
      // TRUE BYPASS: Connect input directly to AudioContext destination
      // This completely skips all processing including the output clipper
      nodes.input.getOutput().connect(ctx.destination);
      
      console.log('Master bypass ENABLED - true dry signal to destination');
    } else {
      // Disconnect bypass route
      nodes.input.getOutput().disconnect();
      
      // Restore internal routing for saturation (may have been broken by disconnect)
      nodes.saturation?.restoreRouting();
      
      // Reconnect normal signal chain
      nodes.input.connect(nodes.preamp!.getInput());
      nodes.preamp!.connect(nodes.toneStack!.getInput());
      nodes.toneStack!.connect(nodes.saturation!.inputGain);
      nodes.saturation!.connect(nodes.speakerSim!.getInput());
      nodes.speakerSim!.connect(nodes.output.getInput());
      
      console.log('Master bypass DISABLED - processing active');
    }
  }, [isInitialized, bypassAll]);

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
        {/* Mobile Notice */}
        <div className="md:hidden mb-4 p-3 bg-ember-orange/20 border border-ember-orange/40 rounded-lg text-center">
          <p className="text-sm text-ember-orange">
            Ember Amp is designed for desktop browsers with virtual audio cables.
          </p>
        </div>

        {/* Header */}
        <Header presets={presets} onPowerToggle={handlePowerToggle} onHelpClick={onHelpClick} />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Signal Chain */}
        <div className="flex flex-col gap-6">
          {/* Top Row: 3 columns - Input, Tone Stack, Saturation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputStage
              devices={inputDevices}
              inputAnalyser={audioNodes.input?.getAnalyser() || null}
              onDeviceChange={handleInputDeviceChange}
            />
            <ToneStage />
            <SaturationStage />
          </div>

          {/* Bottom Row: Output (1 column width) + Credits (2 columns width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OutputStage
              outputAnalyser={audioNodes.output?.getAnalyser() || null}
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
    </div>
  );
}
