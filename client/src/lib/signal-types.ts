export enum SignalLevel {
  MIC = 'mic',      // ~-60 dBu
  LINE = 'line',    // +4 dBu
  SPEAKER = 'spkr'  // High Voltage
}

export interface EquipmentPort {
  id: string;
  label: string;
  expectedLevel: SignalLevel;
  outputLevel?: SignalLevel;
}

export interface MixerChannel {
  id: number;
  fader: number; // 0.0 to 1.0
  auxSends: { id: number; level: number; isPre: boolean }[];
}