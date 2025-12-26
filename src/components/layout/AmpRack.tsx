/**
 * AmpRack - Main container with stage components, preset selector, power button
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './Header';
import { InputStage } from '../stages/InputStage';
import { ToneStage } from '../stages/ToneStage';
import { SaturationStage } from '../stages/SaturationStage';
import { CompressorStage } from '../stages/CompressorStage';
import { OutputStage } from '../stages/OutputStage';
import { useAudioStore } from '../../store/useAudioStore';
import AudioEngine from '../../audio/AudioEngine';
import { InputNode } from '../../audio/nodes/InputNode';
import { PreampNode } from '../../audio/nodes/PreampNode';
import { ToneStackNode } from '../../audio/nodes/ToneStackNode';
import { TubeSaturationNode } from '../../audio/nodes/TubeSaturationNode';
import { CompressorNode } from '../../audio/nodes/CompressorNode';
import { SpeakerSimNode } from '../../audio/nodes/SpeakerSimNode';
import { OutputNode } from '../../audio/nodes/OutputNode';
import presetsData from '../../audio/presets/amp-presets.json';
import type { PresetCollection } from '../../types/audio.types';

interface AudioNodes {
  input: InputNode | null;
  preamp: PreampNode | null;
  toneStack: ToneStackNode | null;
  saturation: TubeSaturationNode | null;
  compressor: CompressorNode | null;
  speakerSim: SpeakerSimNode | null;
  output: OutputNode | null;
}

export function AmpRack(): JSX.Element {
  const [inputDevices, setInputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [outputDevices, setOutputDevices] = useState<Array<{ deviceId: string; label: string; kind: MediaDeviceKind }>>([]);
  const [isOutputDeviceSupported, setIsOutputDeviceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioNodesRef = useRef<AudioNodes>({
    input: null,
    preamp: null,
    toneStack: null,
    saturation: null,
    compressor: null,
    speakerSim: null,
    output: null,
  });

  const [audioNodes, setAudioNodes] = useState<AudioNodes>(audioNodesRef.current);

  const isRunning = useAudioStore((state) => state.isRunning);
  const isInitialized = useAudioStore((state) => state.isInitialized);
  const setInitialized = useAudioStore((state) => state.setInitialized);
  const setRunning = useAudioStore((state) => state.setRunning);

  // Initialize audio engine and create nodes
  const initializeAudio = useCallback(async (): Promise<AudioNodes> => {
    try {
      console.log('Initializing audio engine...');
      const engine = AudioEngine.getInstance();
      await engine.initialize();
      const ctx = engine.getContext();
      console.log('AudioContext created, state:', ctx.state);

      const nodes: AudioNodes = {
        input: new InputNode(ctx),
        preamp: new PreampNode(ctx),
        toneStack: new ToneStackNode(ctx),
        saturation: new TubeSaturationNode(ctx),
        compressor: new CompressorNode(ctx),
        speakerSim: new SpeakerSimNode(ctx),
        output: new OutputNode(ctx),
      };

      // Initialize saturation worklet
      console.log('Initializing saturation worklet...');
      await nodes.saturation.initialize();

      // Connect signal chain using getInput() for proper node connections
      // Input -> Preamp
      nodes.input.connect(nodes.preamp.getInput());
      
      // Preamp -> ToneStack
      nodes.preamp.connect(nodes.toneStack.getInput());
      
      // ToneStack -> Saturation
      nodes.toneStack.connect(nodes.saturation.inputGain);
      
      // Saturation -> Compressor
      nodes.saturation.connect(nodes.compressor.getInput());
      
      // Compressor -> SpeakerSim
      nodes.compressor.connect(nodes.speakerSim.getInput());
      
      // SpeakerSim -> Output
      nodes.speakerSim.connect(nodes.output.getInput());

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
  const compThreshold = useAudioStore((state) => state.compThreshold);
  const compRatio = useAudioStore((state) => state.compRatio);
  const compAttack = useAudioStore((state) => state.compAttack);
  const compRelease = useAudioStore((state) => state.compRelease);
  const bypassCompressor = useAudioStore((state) => state.bypassCompressor);
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
    if (nodes.compressor) {
      nodes.compressor.setThreshold(compThreshold);
      nodes.compressor.setRatio(compRatio);
      nodes.compressor.setAttack(compAttack);
      nodes.compressor.setRelease(compRelease);
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
    compThreshold,
    compRatio,
    compAttack,
    compRelease,
    bypassCompressor,
    outputGain,
  ]);

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
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header presets={presets} onPowerToggle={handlePowerToggle} />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Signal Chain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <InputStage
            devices={inputDevices}
            inputAnalyser={audioNodes.input?.getAnalyser() || null}
            onDeviceChange={handleInputDeviceChange}
          />
          <ToneStage />
          <SaturationStage />
          <CompressorStage />
          <OutputStage
            outputAnalyser={audioNodes.output?.getAnalyser() || null}
            outputDevices={outputDevices}
            onOutputDeviceChange={handleOutputDeviceChange}
            isOutputDeviceSupported={isOutputDeviceSupported}
          />
        </div>
      </div>
    </div>
  );
}
