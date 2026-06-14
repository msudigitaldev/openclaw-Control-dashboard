import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, Activity, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@mission.control");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Access granted. Welcome back, Commander.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1532190872407-280735d27e08?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZWNoJTIwdGV4dHVyZXxlbnwwfHx8fDE3ODE0NjQwMDl8MA&ixlib=rb-4.1.0&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(2px)",
        }}
      />
      <div className="absolute inset-0 bg-[#0a0e1a]/85" />
      <div className="absolute inset-0 grid-bg opacity-40" />

      <div className="relative z-10 w-full max-w-md fade-in">
        <div className="glass rounded-2xl p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-blue-400 to-emerald-500 grid place-items-center mb-4 shadow-lg shadow-blue-500/30">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-gray-400 font-mono-display">
              Authenticate Operator
            </div>
            <h1 className="font-mono-display text-3xl font-extrabold mt-2 text-white">
              MISSION CONTROL
            </h1>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Sign in to command your AI fleet.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400">
                Email
              </Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 h-11 focus-visible:ring-blue-500/40"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400">
                Password
              </Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-11 focus-visible:ring-blue-500/40"
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={busy}
              className="w-full h-11 bg-blue-500 hover:bg-blue-400 text-white font-medium"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {busy ? "Authenticating..." : "Initiate Session"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-[11px] text-gray-500 font-mono-term text-center">
            DEFAULT CREDS · admin@mission.control / password123
          </div>
        </div>
        <div className="text-center mt-4 text-[10px] text-gray-600 font-mono-display tracking-[0.3em] uppercase">
          v2.1.0 · build #4421
        </div>
      </div>
    </div>
  );
}
