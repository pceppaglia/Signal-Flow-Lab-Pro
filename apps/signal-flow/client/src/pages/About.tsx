import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">About Signal Flow Lab</h1>
          <p className="text-slate-400">Educational Audio Engineering Platform</p>
        </div>

        {/* Legal Notice */}
        <Card className="p-6 bg-amber-950 border-amber-800">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-amber-50">Legal Notice</h2>
              <p className="text-amber-100 text-sm leading-relaxed">
                Signal Flow Lab is an independent educational tool created for teaching audio engineering principles and signal flow concepts. We use references to real-world equipment manufacturers and models (such as SSL, Neve, Midas, Shure, Neumann, etc.) for educational and reference purposes only under fair use doctrine.
              </p>
              <p className="text-amber-100 text-sm leading-relaxed">
                <strong>Important:</strong> Signal Flow Lab is not affiliated with, endorsed by, or associated with any equipment manufacturers mentioned in this application. All trademarks, logos, and brand names are the property of their respective owners. We use these references solely to help users understand real-world professional audio equipment and workflows.
              </p>
              <p className="text-amber-100 text-sm leading-relaxed">
                This is an educational simulation and should not be used as a substitute for hands-on training with actual professional audio equipment. Always consult official manufacturer documentation and seek professional guidance when working with real equipment.
              </p>
            </div>
          </div>
        </Card>

        {/* About the App */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">What is Signal Flow Lab?</h2>
          <div className="space-y-4 text-slate-300">
            <p>
              Signal Flow Lab is an interactive web-based learning platform designed to teach audio engineering students and professionals the fundamentals of signal routing, gain staging, and mixing console operation.
            </p>
            <p>
              Through hands-on practice with realistic virtual equipment, users learn how to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Route audio signals through professional mixing consoles</li>
              <li>Understand input/output signal flow and impedance matching</li>
              <li>Set up monitor mixes for live performances</li>
              <li>Use auxiliary sends and returns for effects processing</li>
              <li>Apply proper gain staging techniques</li>
              <li>Identify and prevent clipping and signal degradation</li>
              <li>Work with professional outboard gear (preamps, compressors, EQs, effects)</li>
            </ul>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-4 text-slate-300 text-sm">
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Interactive Workspace</h3>
              <p>Drag-and-drop equipment placement with visual cable routing</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Professional Mixer</h3>
              <p>Configurable multi-channel mixing console with master section</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Real Equipment Library</h3>
              <p>23+ models of professional microphones, preamps, and processors</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Real-time Metering</h3>
              <p>VU meters, peak meters, oscilloscope, and spectrum analyzer</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">Learning Scenarios</h3>
              <p>Guided exercises for band recording, live sound, and studio mixing</p>
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 mb-2">AI Assistant</h3>
              <p>Intelligent feedback on routing decisions and gain staging</p>
            </div>
          </div>
        </Card>

        {/* Disclaimer */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Educational Disclaimer</h2>
          <div className="space-y-4 text-slate-300 text-sm">
            <p>
              Signal Flow Lab is a simplified educational simulation. While we strive for accuracy, this tool:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Does not simulate actual analog or digital audio processing with full fidelity</li>
              <li>Uses simplified models of professional equipment for learning purposes</li>
              <li>Should not be relied upon for actual professional mixing or recording</li>
              <li>Is intended for educational use in schools, studios, and training programs</li>
            </ul>
            <p>
              For professional audio work, always use actual professional equipment and consult with experienced audio engineers.
            </p>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Contact & Support</h2>
          <p className="text-slate-300">
            For questions, feedback, or to report issues, please visit our support page or contact us through the app.
          </p>
        </Card>
      </div>
    </div>
  );
}
