import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { scenarios } from "@/lib/scenarios";
import {
  Zap, BookOpen, Cable, Headphones, Volume2, Settings2,
  GraduationCap, ArrowRight, Mic, SlidersHorizontal, Radio
} from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] overflow-y-auto">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0D0D0D]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E8A020] flex items-center justify-center">
              <span className="font-bold text-[#0D0D0D] text-xs" style={{ fontFamily: 'Impact, sans-serif' }}>RS</span>
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.1rem' }}>
                SIGNAL FLOW LAB
              </div>
              <div className="text-[10px] text-[#A89F94] tracking-widest -mt-1">BY RECORDINGSTUDIO.COM</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-[#A89F94]">Welcome, {user?.name || 'Engineer'}</span>
                <Link href="/lab">
                  <Button className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] font-bold text-xs tracking-wider">
                    OPEN LAB
                  </Button>
                </Link>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] font-bold text-xs tracking-wider">
                  SIGN IN
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8A020]/5 via-transparent to-[#C0392B]/5" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8A020]/10 border border-[#E8A020]/20 mb-8">
            <Zap className="w-3.5 h-3.5 text-[#E8A020]" />
            <span className="text-xs font-semibold text-[#E8A020] tracking-wider">INTERACTIVE AUDIO EDUCATION</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            MASTER <span className="text-[#E8A020]">SIGNAL FLOW</span><br />
            LIKE A PRO
          </h1>
          <p className="text-lg text-[#A89F94] max-w-2xl mx-auto mb-10 leading-relaxed">
            Practice hands-on audio routing with realistic virtual equipment. Learn gain staging,
            signal flow, and professional recording techniques with gear modeled after
            SSL, Neve, and other industry-standard hardware.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/lab">
              <Button size="lg" className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] font-bold tracking-wider text-sm px-8 h-12">
                LAUNCH THE LAB <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/lab/basic-signal-path">
              <Button size="lg" variant="outline" className="border-[#333] text-[#F5F0E8] hover:bg-[#141414] font-bold tracking-wider text-sm px-8 h-12">
                <GraduationCap className="w-4 h-4 mr-2" /> START TUTORIAL
              </Button>
            </Link>
          </div>
          <p className="text-xs text-[#A89F94] mt-6">
            <Link href="/about" className="text-[#E8A020] hover:text-[#d4911c] underline">
              Legal Notice & Disclaimer
            </Link>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            PROFESSIONAL <span className="text-[#E8A020]">TOOLS</span> FOR LEARNING
          </h2>
          <p className="text-center text-[#A89F94] mb-14 max-w-xl mx-auto">
            Everything you need to understand professional audio signal flow, from microphone to speaker.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Mic, title: 'Real-World Equipment', desc: 'Shure SM57, Neumann U87, Neve 1073, UREI 1176, SSL consoles, and more — modeled after the gear used in top studios worldwide.' },
              { icon: Cable, title: 'Drag & Drop Routing', desc: 'Connect equipment with color-coded cables. Mic level (green), line level (amber), and speaker level (red) — just like a real studio.' },
              { icon: SlidersHorizontal, title: 'Interactive Controls', desc: 'Adjust gain, EQ, compression, and effects with realistic knobs, faders, and switches that respond in real-time.' },
              { icon: Volume2, title: 'Live Audio Engine', desc: 'Web Audio API powers real-time signal processing with accurate gain staging, clipping simulation, and metering.' },
              { icon: Headphones, title: 'Monitor Mixing', desc: 'Create independent headphone mixes for multiple performers using auxiliary sends — a critical recording studio skill.' },
              { icon: BookOpen, title: 'Guided Scenarios', desc: 'Step-by-step learning modules take you from basic signal path to complex multi-track recording sessions.' },
              { icon: Radio, title: 'Patch Bay Routing', desc: 'Practice with a virtual patch bay to understand normalling, half-normalling, and flexible signal routing.' },
              { icon: Settings2, title: 'Impedance & Safety', desc: 'Learn about phantom power safety, impedance matching, and proper power-on sequences to protect equipment.' },
              { icon: Zap, title: 'AI Assistant', desc: 'Get real-time feedback on your routing decisions, gain staging, and equipment choices from an intelligent assistant.' },
            ].map((f, i) => (
              <div key={i} className="bg-[#141414] border border-[#222] rounded-lg p-6 hover:border-[#E8A020]/30 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#E8A020]/10 flex items-center justify-center mb-4 group-hover:bg-[#E8A020]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#E8A020]" />
                </div>
                <h3 className="font-bold text-[#F5F0E8] mb-2 text-sm tracking-wide">{f.title}</h3>
                <p className="text-sm text-[#A89F94] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenarios */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            LEARNING <span className="text-[#E8A020]">SCENARIOS</span>
          </h2>
          <p className="text-center text-[#A89F94] mb-14 max-w-xl mx-auto">
            Guided exercises that teach real-world audio engineering skills, from beginner to advanced.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scenarios.map(s => (
              <Link key={s.id} href={`/lab/${s.id}`}>
                <div className="bg-[#141414] border border-[#222] rounded-lg p-5 hover:border-[#E8A020]/40 transition-all cursor-pointer group h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
                      s.difficulty === 'beginner' ? 'bg-green-900/40 text-green-400' :
                      s.difficulty === 'intermediate' ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-red-900/40 text-red-400'
                    }`}>
                      {s.difficulty.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[#A89F94] tracking-wider">{s.category}</span>
                  </div>
                  <h3 className="font-bold text-[#F5F0E8] mb-2 group-hover:text-[#E8A020] transition-colors">{s.title}</h3>
                  <p className="text-xs text-[#A89F94] leading-relaxed">{s.description}</p>
                  <div className="mt-4 text-xs text-[#E8A020] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Scenario <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment Showcase */}
      <section className="py-20 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            EQUIPMENT <span className="text-[#E8A020]">LIBRARY</span>
          </h2>
          <p className="text-center text-[#A89F94] mb-14 max-w-xl mx-auto">
            Authentic models of the world's most iconic recording studio equipment.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Shure SM57', cat: 'Dynamic Mic' },
              { name: 'Neumann U87', cat: 'Condenser Mic' },
              { name: 'Royer R-121', cat: 'Ribbon Mic' },
              { name: 'AKG C414', cat: 'Condenser Mic' },
              { name: 'Neve 1073', cat: 'Preamp + EQ' },
              { name: 'API 512c', cat: 'Preamp' },
              { name: 'SSL VHD', cat: 'Preamp' },
              { name: 'UREI 1176', cat: 'FET Compressor' },
              { name: 'LA-2A', cat: 'Opto Compressor' },
              { name: 'SSL Bus Comp', cat: 'VCA Compressor' },
              { name: 'Pultec EQP-1A', cat: 'Tube EQ' },
              { name: 'SSL E-Series', cat: 'Parametric EQ' },
              { name: 'Lexicon 480L', cat: 'Digital Reverb' },
              { name: 'Roland RE-201', cat: 'Tape Delay' },
              { name: 'SSL 4000 E', cat: 'Channel Strip' },
              { name: 'Neutrik TT', cat: 'Patch Bay' },
              { name: 'Crown XLS', cat: 'Power Amp' },
              { name: 'Yamaha NS-10', cat: 'Monitor' },
            ].map((eq, i) => (
              <div key={i} className="bg-[#141414] border border-[#1a1a1a] rounded p-3 text-center hover:border-[#E8A020]/20 transition-colors">
                <div className="text-xs font-bold text-[#F5F0E8] mb-1">{eq.name}</div>
                <div className="text-[10px] text-[#A89F94]">{eq.cat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signal Level Legend */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            SIGNAL <span className="text-[#E8A020]">LEVELS</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141414] border border-[#222] rounded-lg p-6 text-center">
              <div className="w-4 h-4 rounded-full bg-[#4CAF50] mx-auto mb-3" />
              <h3 className="font-bold text-[#4CAF50] mb-1 text-sm">MIC LEVEL</h3>
              <p className="text-xs text-[#A89F94]">-60 to -20 dBu</p>
              <p className="text-xs text-[#A89F94] mt-1">1-100 millivolts</p>
            </div>
            <div className="bg-[#141414] border border-[#222] rounded-lg p-6 text-center">
              <div className="w-4 h-4 rounded-full bg-[#E8A020] mx-auto mb-3" />
              <h3 className="font-bold text-[#E8A020] mb-1 text-sm">LINE LEVEL</h3>
              <p className="text-xs text-[#A89F94]">-10 to +4 dBu</p>
              <p className="text-xs text-[#A89F94] mt-1">~1.23 volts (pro)</p>
            </div>
            <div className="bg-[#141414] border border-[#222] rounded-lg p-6 text-center">
              <div className="w-4 h-4 rounded-full bg-[#C0392B] mx-auto mb-3" />
              <h3 className="font-bold text-[#C0392B] mb-1 text-sm">SPEAKER LEVEL</h3>
              <p className="text-xs text-[#A89F94]">+20 to +40 dBu</p>
              <p className="text-xs text-[#A89F94] mt-1">10-100 volts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] py-8 px-6 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E8A020] flex items-center justify-center">
              <span className="font-bold text-[#0D0D0D] text-[8px]" style={{ fontFamily: 'Impact, sans-serif' }}>RS</span>
            </div>
            <span className="text-xs text-[#A89F94]">RecordingStudio.com — Record. Learn. Connect.</span>
          </div>
          <span className="text-xs text-[#555]">Signal Flow Lab Pro</span>
        </div>
      </footer>
    </div>
  );
}
