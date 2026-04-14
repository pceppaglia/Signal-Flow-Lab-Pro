import type { EquipmentDef, EquipmentCategory } from '../../../shared/equipment-types';

/** Complete equipment library with real-world gear models */
export const equipmentLibrary: EquipmentDef[] = [
  // ─── SOURCES ───
  {
    id: 'signal-gen',
    name: 'Signal Generator',
    brand: 'Lab',
    model: 'SG-1000',
    category: 'source',
    description: 'Reference tone and noise generator for testing and calibration.',
    educationalInfo: 'Signal generators produce test tones at precise frequencies and levels. They are essential for calibrating equipment, testing signal paths, and troubleshooting audio systems. Common waveforms include sine (pure tone), square, triangle, and white/pink noise.',
    inputs: [],
    outputs: [{ id: 'out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'waveform', label: 'Waveform', type: 'select', default: 'sine', options: [
        { label: 'Sine', value: 'sine' }, { label: 'Square', value: 'square' },
        { label: 'Triangle', value: 'triangle' }, { label: 'Sawtooth', value: 'sawtooth' },
        { label: 'White Noise', value: 'noise' }, { label: 'Pink Noise', value: 'pink' }
      ], tooltip: 'Sine waves are pure tones. Square waves contain odd harmonics. Noise is used for frequency response testing.' },
      { id: 'frequency', label: 'Frequency', type: 'knob', min: 20, max: 20000, step: 1, default: 1000, unit: 'Hz', tooltip: 'The pitch of the generated tone. 1kHz is the standard reference frequency.' },
      { id: 'level', label: 'Level', type: 'knob', min: -60, max: 4, step: 0.5, default: -20, unit: 'dBu', tooltip: 'Output level. +4 dBu is professional line level. 0 dBu = 0.775V RMS.' },
    ],
    width: 160, height: 100, color: '#1a2a1a', accentColor: '#4CAF50',
  },

  // ─── MICROPHONES ───
  {
    id: 'sm57',
    name: 'SM57',
    brand: 'Shure',
    model: 'SM57',
    category: 'microphone',
    description: 'Industry-standard dynamic cardioid microphone. Ideal for instruments and snare drums.',
    educationalInfo: 'The Shure SM57 is a dynamic microphone with a cardioid polar pattern. It uses a moving coil transducer that converts sound pressure into electrical signal. Dynamic mics do not require phantom power and can handle very high SPL, making them ideal for close-miking loud sources like guitar amps and snare drums.',
    inputs: [],
    outputs: [{ id: 'xlr-out', label: 'XLR Out', type: 'mic', direction: 'output', position: 0.5 }],
    controls: [],
    width: 120, height: 80, color: '#2a2a2a', accentColor: '#666',
  },
  {
    id: 'sm58',
    name: 'SM58',
    brand: 'Shure',
    model: 'SM58',
    category: 'microphone',
    description: 'Legendary dynamic vocal microphone with built-in pop filter.',
    educationalInfo: 'The SM58 is the world\'s most popular live vocal microphone. Its built-in spherical wind and pop filter reduces breath noise. The cardioid pattern rejects off-axis sound, reducing feedback in live situations.',
    inputs: [],
    outputs: [{ id: 'xlr-out', label: 'XLR Out', type: 'mic', direction: 'output', position: 0.5 }],
    controls: [],
    width: 120, height: 80, color: '#2a2a2a', accentColor: '#555',
  },
  {
    id: 'u87',
    name: 'U 87',
    brand: 'Neumann',
    model: 'U 87 Ai',
    category: 'microphone',
    description: 'Legendary large-diaphragm condenser. The studio standard for vocals and acoustic instruments.',
    educationalInfo: 'The Neumann U 87 is a large-diaphragm condenser microphone requiring +48V phantom power. It features switchable polar patterns (omni, cardioid, figure-8), a -10dB pad for high SPL sources, and a high-pass filter to reduce proximity effect. Condenser mics have wider frequency response and greater sensitivity than dynamics.',
    inputs: [],
    outputs: [{ id: 'xlr-out', label: 'XLR Out', type: 'mic', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'pattern', label: 'Pattern', type: 'select', default: 'cardioid', options: [
        { label: 'Omni', value: 'omni' }, { label: 'Cardioid', value: 'cardioid' }, { label: 'Figure-8', value: 'figure8' }
      ], tooltip: 'Polar pattern determines which directions the mic picks up sound. Cardioid rejects rear sound, omni picks up equally from all directions, figure-8 picks up front and back.' },
      { id: 'pad', label: 'Pad -10dB', type: 'switch', default: false, tooltip: 'Attenuates the signal by 10dB to prevent internal clipping on loud sources.' },
      { id: 'hpf', label: 'HPF', type: 'switch', default: false, tooltip: 'High-pass filter rolls off low frequencies to reduce rumble and proximity effect.' },
    ],
    width: 120, height: 100, color: '#1a1a2a', accentColor: '#8888cc',
    hasPhantom: true,
  },
  {
    id: 'c414',
    name: 'C 414',
    brand: 'AKG',
    model: 'C 414 XLS',
    category: 'microphone',
    description: 'Versatile multi-pattern large-diaphragm condenser microphone.',
    educationalInfo: 'The AKG C414 offers 9 selectable polar patterns, making it one of the most versatile studio microphones. It features a dual-diaphragm capsule, switchable pre-attenuation pads (-6/-12/-18 dB), and bass-cut filters. Excellent for overheads, acoustic guitar, and vocals.',
    inputs: [],
    outputs: [{ id: 'xlr-out', label: 'XLR Out', type: 'mic', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'pattern', label: 'Pattern', type: 'select', default: 'cardioid', options: [
        { label: 'Omni', value: 'omni' }, { label: 'Wide Card', value: 'wide' },
        { label: 'Cardioid', value: 'cardioid' }, { label: 'Hyper', value: 'hyper' }, { label: 'Figure-8', value: 'figure8' }
      ] },
      { id: 'pad', label: 'Pad', type: 'select', default: '0', options: [
        { label: '0 dB', value: '0' }, { label: '-6 dB', value: '-6' },
        { label: '-12 dB', value: '-12' }, { label: '-18 dB', value: '-18' }
      ] },
    ],
    width: 120, height: 100, color: '#1a1a2a', accentColor: '#6688aa',
    hasPhantom: true,
  },
  {
    id: 'ribbon-121',
    name: 'R-121',
    brand: 'Royer',
    model: 'R-121',
    category: 'microphone',
    description: 'Premium ribbon microphone with figure-8 pattern. Warm, natural tone.',
    educationalInfo: 'Ribbon microphones use a thin metal ribbon suspended in a magnetic field. They produce a warm, natural sound with smooth high-frequency response. CRITICAL: Most ribbon mics can be permanently damaged by +48V phantom power, which magnetizes or stretches the ribbon element. Always verify phantom power is OFF before connecting a ribbon mic.',
    inputs: [],
    outputs: [{ id: 'xlr-out', label: 'XLR Out', type: 'mic', direction: 'output', position: 0.5 }],
    controls: [],
    width: 120, height: 80, color: '#2a1a1a', accentColor: '#cc6666',
  },

  // ─── PREAMPS ───
  {
    id: 'neve-1073',
    name: '1073',
    brand: 'Neve',
    model: '1073',
    category: 'preamp',
    description: 'Classic Class-A discrete transistor preamp with 3-band EQ. The sound of rock and roll.',
    educationalInfo: 'The Neve 1073 is a Class-A discrete transistor microphone preamplifier with a 3-band EQ section. Its transformer-coupled design adds harmonic richness and warmth. The gain structure uses switched gain in 5dB steps with a fine trim. The EQ section features fixed high and low shelving bands plus a sweepable mid-range. This preamp defined the "British sound" of the 1970s.',
    inputs: [
      { id: 'mic-in', label: 'Mic In', type: 'mic', direction: 'input', position: 0.3 },
      { id: 'line-in', label: 'Line In', type: 'line', direction: 'input', position: 0.7 },
    ],
    outputs: [{ id: 'line-out', label: 'Line Out', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'gain', label: 'Gain', type: 'knob', min: 0, max: 80, step: 5, default: 30, unit: 'dB', tooltip: 'Microphone preamplifier gain. Set this to bring the mic signal up to line level (+4 dBu). Too much gain causes distortion; too little results in a noisy signal.' },
      { id: 'phantom', label: '+48V', type: 'switch', default: false, tooltip: 'Phantom power provides +48V DC on pins 2 and 3 of the XLR connector. Required for condenser microphones. WARNING: Can damage ribbon microphones!' },
      { id: 'phase', label: 'Phase', type: 'switch', default: false, tooltip: 'Inverts the polarity of the signal (180°). Used to correct phase issues when using multiple microphones on the same source.' },
      { id: 'pad', label: 'Pad -20dB', type: 'switch', default: false, tooltip: 'Attenuates the input signal by 20dB before the gain stage. Use when the source is too loud for the preamp.' },
      { id: 'hpf', label: 'HPF 80Hz', type: 'switch', default: false, tooltip: 'High-pass filter at 80Hz removes low-frequency rumble, handling noise, and proximity effect.' },
      { id: 'eq-high', label: 'HF 12kHz', type: 'knob', min: -15, max: 15, step: 1, default: 0, unit: 'dB' },
      { id: 'eq-mid', label: 'Mid', type: 'knob', min: -15, max: 15, step: 1, default: 0, unit: 'dB' },
      { id: 'eq-mid-freq', label: 'Mid Freq', type: 'knob', min: 360, max: 7200, step: 100, default: 1600, unit: 'Hz' },
      { id: 'eq-low', label: 'LF 60Hz', type: 'knob', min: -15, max: 15, step: 1, default: 0, unit: 'dB' },
    ],
    width: 180, height: 200, color: '#1a1a28', accentColor: '#4466aa',
    hasPhantom: true,
  },
  {
    id: 'api-512',
    name: '512c',
    brand: 'API',
    model: '512c',
    category: 'preamp',
    description: 'Punchy, aggressive preamp with the signature API sound. 500-series format.',
    educationalInfo: 'The API 512c is a discrete op-amp preamp known for its punchy, forward sound. It uses the proprietary 2520 op-amp and transformer-balanced I/O. The API sound is characterized by a tight low end and aggressive midrange presence, making it popular for drums and electric guitars.',
    inputs: [
      { id: 'mic-in', label: 'Mic In', type: 'mic', direction: 'input', position: 0.3 },
      { id: 'line-in', label: 'Line In', type: 'line', direction: 'input', position: 0.7 },
    ],
    outputs: [{ id: 'line-out', label: 'Line Out', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'gain', label: 'Gain', type: 'knob', min: 0, max: 65, step: 5, default: 30, unit: 'dB' },
      { id: 'phantom', label: '+48V', type: 'switch', default: false },
      { id: 'phase', label: 'Phase', type: 'switch', default: false },
      { id: 'pad', label: 'Pad -20dB', type: 'switch', default: false },
    ],
    width: 140, height: 140, color: '#2a2a1a', accentColor: '#aa8844',
    hasPhantom: true,
  },
  {
    id: 'ssl-vhd',
    name: 'VHD Pre',
    brand: 'SSL',
    model: 'VHD Pre',
    category: 'preamp',
    description: 'SSL preamp with Variable Harmonic Drive for tonal shaping.',
    educationalInfo: 'The SSL VHD (Variable Harmonic Drive) preamp allows you to blend between 2nd-order (even) and 3rd-order (odd) harmonic distortion. Even harmonics sound warm and musical (like tubes), while odd harmonics sound more aggressive and edgy (like transistors). This gives you control over the character of the saturation.',
    inputs: [
      { id: 'mic-in', label: 'Mic In', type: 'mic', direction: 'input', position: 0.3 },
      { id: 'line-in', label: 'Line In', type: 'line', direction: 'input', position: 0.7 },
    ],
    outputs: [{ id: 'line-out', label: 'Line Out', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'gain', label: 'Gain', type: 'knob', min: 0, max: 72, step: 1, default: 30, unit: 'dB' },
      { id: 'vhd', label: 'VHD Drive', type: 'knob', min: 0, max: 100, step: 1, default: 0, unit: '%', tooltip: 'Variable Harmonic Drive. Turn clockwise for more 3rd-order (odd) harmonics, counter-clockwise for 2nd-order (even) harmonics.' },
      { id: 'phantom', label: '+48V', type: 'switch', default: false },
      { id: 'phase', label: 'Phase', type: 'switch', default: false },
      { id: 'hpf', label: 'HPF 75Hz', type: 'switch', default: false },
    ],
    width: 160, height: 160, color: '#1a1a1a', accentColor: '#ffffff',
    hasPhantom: true,
  },

  // ─── COMPRESSORS ───
  {
    id: 'urei-1176',
    name: '1176',
    brand: 'UREI',
    model: '1176LN',
    category: 'compressor',
    description: 'Fast FET compressor. Industry standard for vocals, drums, and bass.',
    educationalInfo: 'The UREI 1176 is a FET (Field Effect Transistor) compressor known for its ultra-fast attack time (20 microseconds to 800 microseconds). It uses a fixed threshold with input/output gain controls. The ratio buttons (4:1, 8:1, 12:1, 20:1) can be pressed simultaneously ("all-buttons" mode) for aggressive compression. The VU meter shows either gain reduction or output level.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'input', label: 'Input', type: 'knob', min: 0, max: 100, step: 1, default: 50, tooltip: 'Input gain drives the signal into the compressor. Higher input = more compression (fixed threshold design).' },
      { id: 'output', label: 'Output', type: 'knob', min: 0, max: 100, step: 1, default: 50, tooltip: 'Make-up gain to restore level lost during compression.' },
      { id: 'attack', label: 'Attack', type: 'knob', min: 1, max: 7, step: 1, default: 4, tooltip: 'Attack speed (1=fastest, 7=slowest). Fast attack clamps transients; slow attack lets transients through for punch.' },
      { id: 'release', label: 'Release', type: 'knob', min: 1, max: 7, step: 1, default: 4, tooltip: 'Release speed (1=fastest, 7=slowest). Fast release can cause pumping; slow release provides smoother compression.' },
      { id: 'ratio', label: 'Ratio', type: 'select', default: '4', options: [
        { label: '4:1', value: '4' }, { label: '8:1', value: '8' },
        { label: '12:1', value: '12' }, { label: '20:1', value: '20' }, { label: 'All', value: 'all' }
      ], tooltip: '4:1 for gentle compression, 20:1 for limiting. "All buttons" mode creates aggressive, distorted compression.' },
    ],
    width: 200, height: 120, color: '#2a2a2a', accentColor: '#888',
  },
  {
    id: 'la2a',
    name: 'LA-2A',
    brand: 'Teletronix',
    model: 'LA-2A',
    category: 'compressor',
    description: 'Optical leveling amplifier. Smooth, musical compression for vocals.',
    educationalInfo: 'The LA-2A is an optical (opto) compressor that uses a light-dependent resistor (LDR) and an electroluminescent panel to control gain. The optical element creates a naturally smooth, program-dependent compression characteristic. Attack and release times are fixed by the optical circuit — attack is around 10ms, release varies from 40ms to several seconds depending on signal duration. This makes it ideal for vocals and bass.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'gain', label: 'Gain', type: 'knob', min: 0, max: 100, step: 1, default: 50, tooltip: 'Output gain (make-up gain) to compensate for level reduction.' },
      { id: 'peak-reduction', label: 'Peak Reduction', type: 'knob', min: 0, max: 100, step: 1, default: 30, tooltip: 'Controls the amount of compression. Higher values = more gain reduction.' },
      { id: 'mode', label: 'Mode', type: 'select', default: 'compress', options: [
        { label: 'Compress', value: 'compress' }, { label: 'Limit', value: 'limit' }
      ], tooltip: 'Compress mode has a gentle ratio (~3:1). Limit mode increases the ratio for more aggressive gain reduction.' },
    ],
    width: 200, height: 110, color: '#2a2820', accentColor: '#ccaa66',
  },
  {
    id: 'ssl-bus-comp',
    name: 'Bus Compressor',
    brand: 'SSL',
    model: 'G-Series Bus Comp',
    category: 'compressor',
    description: 'The legendary SSL bus compressor. Glues the mix together.',
    educationalInfo: 'The SSL G-Series Bus Compressor is a VCA (Voltage Controlled Amplifier) compressor designed for the stereo bus. It "glues" a mix together by applying gentle, transparent compression to the entire mix. The auto-release feature provides program-dependent release timing. Common settings: 4:1 ratio, 10-30ms attack, auto release, 2-4dB gain reduction.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'threshold', label: 'Threshold', type: 'knob', min: -20, max: 10, step: 0.5, default: 0, unit: 'dB' },
      { id: 'makeup', label: 'Make-Up', type: 'knob', min: 0, max: 20, step: 0.5, default: 0, unit: 'dB' },
      { id: 'ratio', label: 'Ratio', type: 'select', default: '4', options: [
        { label: '2:1', value: '2' }, { label: '4:1', value: '4' }, { label: '10:1', value: '10' }
      ] },
      { id: 'attack', label: 'Attack', type: 'select', default: '10', options: [
        { label: '0.1ms', value: '0.1' }, { label: '0.3ms', value: '0.3' },
        { label: '1ms', value: '1' }, { label: '3ms', value: '3' },
        { label: '10ms', value: '10' }, { label: '30ms', value: '30' }
      ] },
      { id: 'release', label: 'Release', type: 'select', default: 'auto', options: [
        { label: '0.1s', value: '0.1' }, { label: '0.3s', value: '0.3' },
        { label: '0.6s', value: '0.6' }, { label: '1.2s', value: '1.2' }, { label: 'Auto', value: 'auto' }
      ] },
    ],
    width: 200, height: 120, color: '#1a1a1a', accentColor: '#ddd',
  },
  {
    id: 'dbx-160',
    name: '160',
    brand: 'dbx',
    model: '160A',
    category: 'compressor',
    description: 'Hard-knee VCA compressor. Punchy and precise for drums.',
    educationalInfo: 'The dbx 160 is a VCA compressor with a hard-knee characteristic, meaning compression engages abruptly at the threshold. This creates a punchy, aggressive sound ideal for drums and percussion. The "over easy" mode on some versions adds a soft-knee option for smoother compression.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'threshold', label: 'Threshold', type: 'knob', min: -40, max: 20, step: 1, default: 0, unit: 'dB' },
      { id: 'ratio', label: 'Ratio', type: 'knob', min: 1, max: 40, step: 0.5, default: 4 },
      { id: 'output', label: 'Output', type: 'knob', min: -20, max: 20, step: 0.5, default: 0, unit: 'dB' },
    ],
    width: 180, height: 100, color: '#2a2a2a', accentColor: '#66aacc',
  },

  // ─── EQ ───
  {
    id: 'pultec-eqp1a',
    name: 'EQP-1A',
    brand: 'Pultec',
    model: 'EQP-1A',
    category: 'eq',
    description: 'Passive tube EQ. Legendary for its musical low-frequency boost and cut trick.',
    educationalInfo: 'The Pultec EQP-1A is a passive tube equalizer famous for its smooth, musical sound. Its unique design allows simultaneous boost and cut at the same low frequency, creating a characteristic "Pultec trick" that tightens the low end while adding warmth. The tube makeup gain stage adds subtle harmonic saturation.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'lf-boost', label: 'LF Boost', type: 'knob', min: 0, max: 10, step: 0.5, default: 0 },
      { id: 'lf-atten', label: 'LF Atten', type: 'knob', min: 0, max: 10, step: 0.5, default: 0 },
      { id: 'lf-freq', label: 'LF Freq', type: 'select', default: '100', options: [
        { label: '20Hz', value: '20' }, { label: '30Hz', value: '30' }, { label: '60Hz', value: '60' },
        { label: '100Hz', value: '100' }
      ] },
      { id: 'hf-boost', label: 'HF Boost', type: 'knob', min: 0, max: 10, step: 0.5, default: 0 },
      { id: 'hf-freq', label: 'HF Freq', type: 'select', default: '5000', options: [
        { label: '3kHz', value: '3000' }, { label: '4kHz', value: '4000' },
        { label: '5kHz', value: '5000' }, { label: '8kHz', value: '8000' },
        { label: '10kHz', value: '10000' }, { label: '12kHz', value: '12000' }, { label: '16kHz', value: '16000' }
      ] },
      { id: 'hf-atten', label: 'HF Atten', type: 'select', default: '0', options: [
        { label: '5kHz', value: '5000' }, { label: '10kHz', value: '10000' }, { label: '20kHz', value: '20000' }
      ] },
    ],
    width: 220, height: 120, color: '#2a2820', accentColor: '#ccaa44',
  },
  {
    id: 'ssl-e-eq',
    name: 'E-Series EQ',
    brand: 'SSL',
    model: '4000 E-Series EQ',
    category: 'eq',
    description: 'SSL 4000 E-Series channel EQ. Surgical and musical.',
    educationalInfo: 'The SSL E-Series EQ is a 4-band parametric equalizer found on the legendary SSL 4000 E console. The "black knob" version features a more aggressive, characterful sound compared to the later "brown knob" G-Series. Each band has frequency, gain, and Q controls, giving precise surgical control over the frequency spectrum.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'hf-gain', label: 'HF Gain', type: 'knob', min: -15, max: 15, step: 0.5, default: 0, unit: 'dB' },
      { id: 'hf-freq', label: 'HF Freq', type: 'knob', min: 1500, max: 16000, step: 100, default: 8000, unit: 'Hz' },
      { id: 'hmf-gain', label: 'HMF Gain', type: 'knob', min: -15, max: 15, step: 0.5, default: 0, unit: 'dB' },
      { id: 'hmf-freq', label: 'HMF Freq', type: 'knob', min: 600, max: 7000, step: 100, default: 2000, unit: 'Hz' },
      { id: 'lmf-gain', label: 'LMF Gain', type: 'knob', min: -15, max: 15, step: 0.5, default: 0, unit: 'dB' },
      { id: 'lmf-freq', label: 'LMF Freq', type: 'knob', min: 200, max: 2500, step: 50, default: 600, unit: 'Hz' },
      { id: 'lf-gain', label: 'LF Gain', type: 'knob', min: -15, max: 15, step: 0.5, default: 0, unit: 'dB' },
      { id: 'lf-freq', label: 'LF Freq', type: 'knob', min: 30, max: 450, step: 10, default: 100, unit: 'Hz' },
    ],
    width: 180, height: 200, color: '#1a1a1a', accentColor: '#ddd',
  },

  // ─── EFFECTS ───
  {
    id: 'lexicon-480',
    name: '480L',
    brand: 'Lexicon',
    model: '480L',
    category: 'effects',
    description: 'Legendary digital reverb. The gold standard for studio reverb.',
    educationalInfo: 'The Lexicon 480L is considered the finest digital reverb ever made. Its algorithms create lush, three-dimensional reverb tails that sit beautifully in a mix. Reverb is typically used on an auxiliary send/return, not as an insert, so the dry signal passes through unaffected while the reverb is blended in parallel.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'program', label: 'Program', type: 'select', default: 'hall', options: [
        { label: 'Hall', value: 'hall' }, { label: 'Plate', value: 'plate' },
        { label: 'Room', value: 'room' }, { label: 'Chamber', value: 'chamber' },
        { label: 'Ambience', value: 'ambience' }
      ] },
      { id: 'decay', label: 'Decay', type: 'knob', min: 0.1, max: 20, step: 0.1, default: 2.0, unit: 's' },
      { id: 'predelay', label: 'Pre-Delay', type: 'knob', min: 0, max: 250, step: 1, default: 20, unit: 'ms' },
      { id: 'mix', label: 'Mix', type: 'knob', min: 0, max: 100, step: 1, default: 100, unit: '%' },
    ],
    width: 200, height: 120, color: '#1a2020', accentColor: '#44aaaa',
  },
  {
    id: 'tape-delay',
    name: 'Space Echo',
    brand: 'Roland',
    model: 'RE-201',
    category: 'effects',
    description: 'Classic tape echo with chorus and reverb. Warm, analog delay.',
    educationalInfo: 'The Roland Space Echo uses a physical tape loop with multiple playback heads to create delay effects. The tape medium adds warmth, saturation, and natural degradation to the repeats. The multiple heads can be combined for rhythmic patterns. Tape speed affects delay time, and the tape naturally degrades high frequencies on each repeat.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [{ id: 'line-out', label: 'Output', type: 'line', direction: 'output', position: 0.5 }],
    controls: [
      { id: 'delay-time', label: 'Delay Time', type: 'knob', min: 50, max: 1000, step: 10, default: 300, unit: 'ms' },
      { id: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 100, step: 1, default: 40, unit: '%' },
      { id: 'mix', label: 'Mix', type: 'knob', min: 0, max: 100, step: 1, default: 30, unit: '%' },
      { id: 'intensity', label: 'Intensity', type: 'knob', min: 0, max: 100, step: 1, default: 50, unit: '%' },
    ],
    width: 200, height: 110, color: '#2a2020', accentColor: '#cc6644',
  },

  // ─── PATCH BAY ───
  {
    id: 'patchbay',
    name: 'Patch Bay',
    brand: 'Neutrik',
    model: '48-Point TT',
    category: 'patchbay',
    description: '48-point TT (Tiny Telephone) patch bay for flexible signal routing.',
    educationalInfo: 'A patch bay centralizes all studio connections in one location. The top row typically carries outputs (sources) and the bottom row carries inputs (destinations). In "normal" mode, top and bottom are internally connected. Inserting a patch cable breaks the normal and creates a new routing. Half-normal mode allows you to mult (split) a signal by only inserting into the bottom row.',
    inputs: [
      { id: 'in-1', label: 'In 1', type: 'line', direction: 'input', position: 0.1 },
      { id: 'in-2', label: 'In 2', type: 'line', direction: 'input', position: 0.3 },
      { id: 'in-3', label: 'In 3', type: 'line', direction: 'input', position: 0.5 },
      { id: 'in-4', label: 'In 4', type: 'line', direction: 'input', position: 0.7 },
      { id: 'in-5', label: 'In 5', type: 'line', direction: 'input', position: 0.9 },
    ],
    outputs: [
      { id: 'out-1', label: 'Out 1', type: 'line', direction: 'output', position: 0.1 },
      { id: 'out-2', label: 'Out 2', type: 'line', direction: 'output', position: 0.3 },
      { id: 'out-3', label: 'Out 3', type: 'line', direction: 'output', position: 0.5 },
      { id: 'out-4', label: 'Out 4', type: 'line', direction: 'output', position: 0.7 },
      { id: 'out-5', label: 'Out 5', type: 'line', direction: 'output', position: 0.9 },
    ],
    controls: [
      { id: 'mode', label: 'Mode', type: 'select', default: 'normal', options: [
        { label: 'Normal', value: 'normal' }, { label: 'Half-Normal', value: 'half-normal' },
        { label: 'Thru', value: 'thru' }
      ], tooltip: 'Normal: top/bottom connected internally. Half-Normal: inserting bottom breaks normal, inserting top does not. Thru: no internal connection.' },
    ],
    width: 300, height: 80, color: '#222', accentColor: '#888',
  },

  // ─── AMPLIFIER ───
  {
    id: 'power-amp',
    name: 'Power Amplifier',
    brand: 'Crown',
    model: 'XLS 2502',
    category: 'amplifier',
    description: 'Professional power amplifier for studio monitors and PA systems.',
    educationalInfo: 'A power amplifier takes line-level signal and amplifies it to speaker level, providing enough current to drive loudspeakers. Impedance matching is critical: the amplifier\'s output impedance must match the speaker load. Running speakers with lower impedance than the amp is rated for can cause overheating and damage. Running higher impedance is safe but reduces power output.',
    inputs: [{ id: 'line-in', label: 'Input', type: 'line', direction: 'input', position: 0.5 }],
    outputs: [
      { id: 'spk-out-l', label: 'Speaker L', type: 'speaker', direction: 'output', position: 0.3 },
      { id: 'spk-out-r', label: 'Speaker R', type: 'speaker', direction: 'output', position: 0.7 },
    ],
    controls: [
      { id: 'power', label: 'Power', type: 'switch', default: false, tooltip: 'Main power switch. Always power on the amplifier LAST in the signal chain, and power it off FIRST.' },
      { id: 'level', label: 'Level', type: 'knob', min: -60, max: 0, step: 0.5, default: -20, unit: 'dB' },
      { id: 'impedance', label: 'Impedance', type: 'select', default: '8', options: [
        { label: '4 Ohm', value: '4' }, { label: '8 Ohm', value: '8' }, { label: '16 Ohm', value: '16' }
      ], tooltip: 'Set to match your speaker impedance. Mismatched impedance can damage the amplifier or speakers.' },
    ],
    width: 180, height: 120, color: '#1a1a1a', accentColor: '#cc4444',
  },

  // ─── MONITORS ───
  {
    id: 'monitor-speaker',
    name: 'Studio Monitor',
    brand: 'Yamaha',
    model: 'NS-10M',
    category: 'monitor',
    description: 'Industry-standard near-field studio monitor. If it sounds good on NS-10s, it sounds good everywhere.',
    educationalInfo: 'Studio monitors are designed for accurate, uncolored sound reproduction. Near-field monitors are placed close to the listener to minimize room reflections. The Yamaha NS-10M became the industry standard because of its unforgiving midrange — if a mix sounds good on NS-10s, it will translate well to consumer speakers.',
    inputs: [{ id: 'spk-in', label: 'Speaker In', type: 'speaker', direction: 'input', position: 0.5 }],
    outputs: [],
    controls: [],
    width: 120, height: 140, color: '#2a2a2a', accentColor: '#888',
  },
  {
    id: 'headphone-amp',
    name: 'Headphone Amp',
    brand: 'Grace Design',
    model: 'm908',
    category: 'monitor',
    description: 'Multi-channel headphone amplifier for performer monitor mixes.',
    educationalInfo: 'A headphone amplifier provides individual monitor mixes for performers during recording. Each output has its own level control, allowing musicians to hear a custom blend of instruments. This is essential for comfortable recording — a singer might want more vocals, while a drummer wants more click track.',
    inputs: [
      { id: 'mix-1', label: 'Mix 1 In', type: 'line', direction: 'input', position: 0.2 },
      { id: 'mix-2', label: 'Mix 2 In', type: 'line', direction: 'input', position: 0.5 },
      { id: 'mix-3', label: 'Mix 3 In', type: 'line', direction: 'input', position: 0.8 },
    ],
    outputs: [],
    controls: [
      { id: 'level-1', label: 'HP 1 Level', type: 'knob', min: -60, max: 0, step: 0.5, default: -20, unit: 'dB' },
      { id: 'level-2', label: 'HP 2 Level', type: 'knob', min: -60, max: 0, step: 0.5, default: -20, unit: 'dB' },
      { id: 'level-3', label: 'HP 3 Level', type: 'knob', min: -60, max: 0, step: 0.5, default: -20, unit: 'dB' },
    ],
    width: 200, height: 100, color: '#1a1a2a', accentColor: '#6666cc',
  },

  // ─── RECORDER ───
  {
    id: 'daw-interface',
    name: 'Audio Interface',
    brand: 'Universal Audio',
    model: 'Apollo x8',
    category: 'recorder',
    description: 'Professional audio interface with 8 inputs. The bridge between analog and digital.',
    educationalInfo: 'An audio interface converts analog audio signals to digital (A/D conversion) for recording into a DAW, and converts digital back to analog (D/A conversion) for monitoring. Sample rate and bit depth determine the quality of the conversion. 24-bit/96kHz is common for professional recording. The interface also provides low-latency monitoring for performers.',
    inputs: [
      { id: 'in-1', label: 'Input 1', type: 'line', direction: 'input', position: 0.15 },
      { id: 'in-2', label: 'Input 2', type: 'line', direction: 'input', position: 0.35 },
      { id: 'in-3', label: 'Input 3', type: 'line', direction: 'input', position: 0.55 },
      { id: 'in-4', label: 'Input 4', type: 'line', direction: 'input', position: 0.75 },
    ],
    outputs: [
      { id: 'out-1', label: 'Output 1-2', type: 'line', direction: 'output', position: 0.3 },
      { id: 'out-2', label: 'Output 3-4', type: 'line', direction: 'output', position: 0.7 },
    ],
    controls: [
      { id: 'sample-rate', label: 'Sample Rate', type: 'select', default: '48000', options: [
        { label: '44.1 kHz', value: '44100' }, { label: '48 kHz', value: '48000' },
        { label: '96 kHz', value: '96000' }, { label: '192 kHz', value: '192000' }
      ] },
    ],
    width: 240, height: 120, color: '#1a1a1a', accentColor: '#8844cc',
  },
];

/** Get equipment by category */
export function getEquipmentByCategory(category: EquipmentCategory): EquipmentDef[] {
  return equipmentLibrary.filter(e => e.category === category);
}

/** Get equipment by ID */
export function getEquipmentById(id: string): EquipmentDef | undefined {
  return equipmentLibrary.find(e => e.id === id);
}

/** Signal level colors matching RecordingStudio.com brand */
export const signalColors: Record<string, string> = {
  mic: '#4CAF50',     // Green for mic level
  line: '#E8A020',    // Amber for line level (brand accent)
  speaker: '#C0392B', // Red for speaker level
  digital: '#6688cc', // Blue for digital
};

/** Signal level descriptions */
export const signalLevelInfo: Record<string, { label: string; voltage: string; dbRange: string }> = {
  mic: { label: 'Mic Level', voltage: '1-100 mV', dbRange: '-60 to -20 dBu' },
  line: { label: 'Line Level', voltage: '1.23V (+4 dBu)', dbRange: '-10 to +4 dBu' },
  speaker: { label: 'Speaker Level', voltage: '10-100V', dbRange: '+20 to +40 dBu' },
  digital: { label: 'Digital', voltage: 'N/A', dbRange: '0 dBFS max' },
};
