import type { EquipmentDef } from '@/lib/equipment-library';

export interface TheoryBlock {
  title: string;
  body: string;
}

const CATEGORY_THEORY: Record<string, TheoryBlock> = {
  preamp: {
    title: 'Transformer preamp (mic → line)',
    body:
      'A transformer-coupled mic preamp boosts the tiny voltage from a microphone to robust line level while adding subtle color from the input transformer and gain stage. You set gain so peaks sit in the “sweet spot”: loud enough above the noise floor, but below clipping. Phantom (+48 V) is only for condensers that need it—never patch a passive ribbon the wrong way without knowing the preamp’s design.',
  },
  compressor: {
    title: 'FET compressor (e.g. 1176-style)',
    body:
      'FET (field-effect transistor) limiters use a very fast gain-control element to clamp peaks. They are famous for aggressive, “present” drums and vocals. Input drives how hard the detector works; Output makes up level after reduction. Ratio buttons select how extreme the limiting is. Unlike optical or tube leveling amps, FET units can grab transients almost instantly, which is why they feel “fast” and punchy.',
  },
  eq: {
    title: 'Passive / program EQ',
    body:
      'Classic program EQs like the Pultec topology use passive LC filters followed by makeup gain. “Boost” and “Attenuate” on the same band create curves that are musically forgiving—engineers often use small simultaneous boosts and cuts (the “Pultec trick”) to sculpt low end without making it sound hollow. Large bakelite knobs encourage broad, musical moves rather than surgical notching.',
  },
  microphone: {
    title: 'Microphone pickup patterns & level',
    body:
      'Dynamics (e.g. SM57) are robust, handle high SPL, and need no phantom power. Large-diaphragm condensers (e.g. U87) are more sensitive, offer pattern options on some models, and require phantom. Always gain-stage at the preamp so mic level becomes healthy line level before EQ, dynamics, or converters.',
  },
  console: {
    title: 'Analog console routing',
    body:
      'A console sums many channels to a stereo bus, with per-channel EQ, dynamics, aux sends, and pan. “Line up” gain so each stage sits in its nominal range; the master bus is the last place you want unexpected headroom issues. Faders and VCAs are your macro control—detailed tone shaping usually happens earlier in the channel strip.',
  },
};

const DEF_OVERRIDES: Partial<Record<string, TheoryBlock>> = {
  'neve-1073': {
    title: 'Neve 1073 — transformer color',
    body:
      'The 1073’s Marinair-style transformers and Class-A gain blocks create thick lows and a forward midrange. The red Marconi knob is mic gain; the blue/grey EQ section is a simple but musical three-band shelf/peaking network. Small EQ moves on a 1073 often read as large in the mix—that’s the “Neve weight” people describe.',
  },
  'api-512c': {
    title: 'API 512c — American punch',
    body:
      'API’s discrete op-amp (“2520”) circuits are known for fast transients and mid-forward assertiveness. The 512c is a single-channel 500-series–style preamp: tight low end, clear attack on drums and guitars. The “API sound” is often contrasted with Neve’s rounder, darker transformer character.',
  },
  'urei-1176': {
    title: 'UREI 1176 — FET limiting',
    body:
      'The 1176 is a fixed-threshold FET compressor: you drive level with Input and balance level with Output. All-buttons-in modes (beyond this UI) are a famous experimental setting. On drums and vocals, it’s a cornerstone of rock and pop density—fast attack, musical release, and obvious “grab.”',
  },
  'pultec-eqp1a': {
    title: 'Pultec EQP-1A — program EQ',
    body:
      'The EQP-1A is a passive EQ with tube makeup gain. Separate boost and attenuate controls per band interact in non-obvious ways, which is part of its charm. Engineers use broad LF boosts for weight and gentle HF shelves for air. It is not a surgical “notch” tool—it shines on busses and full mixes.',
  },
  'shure-sm57': {
    title: 'SM57 — dynamic workhorse',
    body:
      'The SM57 is a moving-coil dynamic with a tight cardioid pattern and a presence rise that helps snares and guitar amps cut through a dense mix. It tolerates very high SPL and rough handling; proximity effect adds low end when you close-mic sources.',
  },
  u87: {
    title: 'Neumann U87 — large-diaphragm condenser',
    body:
      'The U87 is a multi-pattern large-diaphragm condenser known for balanced detail and extended lows. It needs phantom power and careful gain staging—much more sensitive than a dynamic. It’s a first-call vocal and instrument mic in studios where neutrality with a hint of polish is the goal.',
  },
};

export function getTheoryForEquipment(def: EquipmentDef): TheoryBlock {
  const byId = DEF_OVERRIDES[def.id];
  if (byId) return byId;
  return (
    CATEGORY_THEORY[def.category] ?? {
      title: 'Signal flow',
      body:
        'Every piece of gear is a stage in your chain: match levels (mic / line / speaker), mind headroom, and listen for distortion or noise. The inspector shows parameters; your ears confirm whether the stage is doing what you intend.',
    }
  );
}
