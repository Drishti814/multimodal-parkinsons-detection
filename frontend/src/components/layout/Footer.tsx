import { Link } from "react-router-dom";
import { Activity, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-20">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-base">NeuroDetect</span>
                <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Clinical AI</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An AI-powered screening platform for early detection of Parkinson's disease through voice and motor analysis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { to: "/about", label: "About the Project" },
                { to: "/test", label: "Take a Test" },
                { to: "/history", label: "View History" },
                { to: "/reports", label: "Sample Report" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-4 text-foreground">Resources</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Clinical Guidelines</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Research Papers</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-sm mb-4 text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 text-primary" />
                <span>contact@neurodetect.health</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 mt-0.5 text-primary" />
                <span>+1 (800) 555-0142</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <span>1200 Medical Center Drive<br />Boston, MA 02115</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NeuroDetect Clinical AI. For research and screening purposes only.
          </p>
          <p className="text-xs text-muted-foreground">
            Not a substitute for professional medical diagnosis.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
