/**
 * useAudioInput - Manages device selection, permission handling, stream lifecycle
 */

import { useState, useEffect, useCallback } from 'react';
import AudioEngine from '../audio/AudioEngine';
import { InputNode } from '../audio/nodes/InputNode';
import type { AudioDeviceInfo } from '../types/audio.types';

export function useAudioInput() {
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [inputNode, setInputNode] = useState<InputNode | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Enumerate devices
  const refreshDevices = useCallback(async () => {
    try {
      const engine = AudioEngine.getInstance();
      const deviceList = await engine.enumerateDevices();
      setDevices(deviceList);
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, []);

  // Set input device
  const setInputDevice = useCallback(
    async (deviceId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const engine = AudioEngine.getInstance();
        if (!engine.getInitialized()) {
          await engine.initialize();
        }

        const ctx = engine.getContext();
        const node = new InputNode(ctx);
        await node.setInput(deviceId);
        setInputNode(node);
      } catch (err) {
        console.error('Failed to set input device:', err);
        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
              setError(new Error('Microphone permission denied'));
              break;
            case 'NotFoundError':
              setError(new Error('No audio input device found'));
              break;
            case 'NotReadableError':
              setError(new Error('Audio device is in use by another application'));
              break;
            default:
              setError(new Error(`Audio error: ${err.message}`));
          }
        } else {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inputNode) {
        inputNode.disconnect();
      }
    };
  }, [inputNode]);

  // Initial device enumeration
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    devices,
    inputNode,
    error,
    isLoading,
    setInputDevice,
    refreshDevices,
  };
}

