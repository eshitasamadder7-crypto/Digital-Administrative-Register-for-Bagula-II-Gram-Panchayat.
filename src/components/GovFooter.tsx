import { Link } from "react-router-dom";

export default function GovFooter() {
  return (
    <footer className="no-print mt-auto" style={{ background: "hsl(230 76% 25%)", color: "white" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="font-bold mb-3 text-base" style={{ color: "hsl(30 100% 60%)" }}>Office Details</h3>
            <p className="opacity-80 leading-relaxed">Bagula II Gram Panchayat</p>
            <p className="opacity-80 leading-relaxed">Vill: Stationpara, P.O.: Bagula</p>
            <p className="opacity-80 leading-relaxed">P.S.: Hanskhali, Nadia, W.B.</p>
          </div>
          <div>
            <h3 className="font-bold mb-3 text-base" style={{ color: "hsl(30 100% 60%)" }}>Contact</h3>
            <p className="opacity-80 text-xs leading-relaxed">
              Email: <a href="mailto:bagula2nogp111@gmail.com" className="underline hover:opacity-100">bagula2nogp111@gmail.com</a>
            </p>
            <p className="opacity-80 text-xs leading-relaxed mt-1">Working hours: Mon–Fri, 10:00 AM – 5:00 PM</p>
            <div className="mt-3 space-y-1">
              <Link to="/elected-representatives" className="block opacity-80 hover:opacity-100 text-xs">🏛️ Elected Representatives</Link>
              <Link to="/wbpms-info" className="block opacity-80 hover:opacity-100 text-xs">📑 Document Requirements</Link>
              <a href="https://wbpms.in/citizen/" target="_blank" rel="noopener noreferrer" className="block opacity-80 hover:opacity-100 text-xs">🌐 WBPMS Portal</a>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-3 text-base" style={{ color: "hsl(30 100% 60%)" }}>Disclaimer</h3>
            <p className="opacity-70 text-xs leading-relaxed">
              Public facilitation platform. Certificates generated here are draft-based.
              No personal data is stored on server — all processing happens locally in your browser.
            </p>
            <p className="opacity-90 text-xs leading-relaxed mt-2 font-semibold">
              For official verification, please contact the Gram Panchayat office.
            </p>
          </div>
        </div>
        <div className="border-t border-white/20 mt-6 pt-4">
          <p className="text-xs opacity-70 leading-relaxed text-center max-w-4xl mx-auto mb-3">
            <strong>Disclaimer:</strong> This website serves as a public facilitation platform of Bagula II Gram Panchayat. External services are governed by respective Government portals. Certificates generated here are draft-based and subject to official verification. No user data is stored on server; all processing occurs locally. Use of this platform must comply with applicable laws of India.
          </p>
          <p className="text-center text-xs opacity-60">
            © {new Date().getFullYear()} Bagula II Gram Panchayat. All rights reserved.
          </p>
        </div>
      </div>
      <div className="gov-tricolor-top" style={{ transform: "rotate(180deg)" }} />
    </footer>
  );
}
