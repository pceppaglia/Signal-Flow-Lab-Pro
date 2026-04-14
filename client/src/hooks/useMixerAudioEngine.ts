import { useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '@/lib/audio-engine-v2';
import type { ChannelState, MasterState } from './useMixerState';

/**
 * Hook to sync mixer state changes with the audio engine.
 * Applies mixer controls to actual audio processing.
 */
export function useMixerAudioEngine(
  channels: ChannelState[],
  master: MasterState,
  onChannelChange: (channelId: string, updates: Partial<ChannelState>) => void,
  onMasterChange: (updates: Partial<MasterState>) => void
) {
  const meterUpdateIntervalRef = useRef<number | null>(null);

  // Sync master faders to audio engine
  useEffect(() => {
    if (!audioEngine.isRunning) return;

    // Master L/R faders control the master gain
    // Average the L/R levels for master gain
    const avgMasterLevel = (master.masterL + master.masterR) / 2;
    audioEngine.setMasterGain(avgMasterLevel);
  }, [master.masterL, master.masterR]);

  // Sync aux return levels to audio engine
  useEffect(() => {
    if (!audioEngine.isRunning) return;

    master.auxReturns.forEach((auxReturn, index) => {
      const auxId = `aux${index + 1}`;
      audioEngine.setAuxReturnLevel(auxId, auxReturn.level);
    });
  }, [master.auxReturns]);

  // Sync channel fader levels to audio engine nodes
  useEffect(() => {
    if (!audioEngine.isRunning) return;

    channels.forEach((channel) => {
      // For now, we control the master gain based on channel faders
      // In a full implementation, each channel would have its own node
      // For demo purposes, we'll use the first channel to control overall mix
      if (channel.id === '1') {
        audioEngine.setNodeGain(channel.id, channel.faderLevel);
      }
    });
  }, [channels]);

  // Update meter levels from audio engine at ~30fps
  const updateMetersFromEngine = useCallback(() => {
    if (!audioEngine.isRunning) return;

    const rmsLevel = audioEngine.getRMSLevel();
    const peakLevel = audioEngine.getPeakLevel();

    // Convert linear levels to dB for display
    // RMS: 0-1 linear -> -60 to 0 dB
    // Peak: 0-1 linear -> -60 to 0 dB
    const rmsDb = rmsLevel === 0 ? -Infinity : 20 * Math.log10(rmsLevel);
    const peakDb = peakLevel === 0 ? -Infinity : 20 * Math.log10(peakLevel);

    // Update all channels with the same metering data (simplified for now)
    // In a full implementation, each channel would have its own analyser node
    channels.forEach((channel, index) => {
      // Vary the input level slightly per channel for visual interest
      const channelVariation = 0.8 + (index * 0.04);
      const inputLevel = Math.max(0, rmsLevel * channelVariation);
      const outputLevel = Math.max(0, rmsLevel * 0.9);

      onChannelChange(channel.id, {
        inputLevel,
        outputLevel,
      });
    });

    // Update master metering
    onMasterChange({
      masterL: Math.max(0, peakLevel),
      masterR: Math.max(0, peakLevel),
    });
  }, [channels, onChannelChange, onMasterChange]);

  // Start/stop meter polling based on audio engine state
  useEffect(() => {
    if (audioEngine.isRunning) {
      // Poll meter levels at ~30fps
      meterUpdateIntervalRef.current = window.setInterval(updateMetersFromEngine, 33);
    } else {
      if (meterUpdateIntervalRef.current !== null) {
        clearInterval(meterUpdateIntervalRef.current);
        meterUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (meterUpdateIntervalRef.current !== null) {
        clearInterval(meterUpdateIntervalRef.current);
        meterUpdateIntervalRef.current = null;
      }
    };
  }, [updateMetersFromEngine]);

  // Subscribe to audio engine state changes
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      // Handle state changes if needed
      // For now, the meter polling handles updates
    });

    return unsubscribe;
  }, []);

  return {
    updateMetersFromEngine,
  };
}
