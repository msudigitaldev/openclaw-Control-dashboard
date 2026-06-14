import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Bell, Lock, Plug, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [tab, setTab] = useState("connections");

  // Connection state
  const [url, setUrl] = useState("https://api.openclaw.example.com");
  const [apiKey, setApiKey] = useState("");
  const [connStatus, setConnStatus] = useState("unknown"); // unknown | ok | fail | testing

  // Notification state
  const [desktop, setDesktop] = useState(true);
  const [sound, setSound] = useState(false);
  const [email, setEmail] = useState(true);
  const [costThreshold, setCostThreshold] = useState([10]);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [twoFA, setTwoFA] = useState(false);

  const testConnection = async () => {
    setConnStatus("testing");
    setTimeout(() => {
      const ok = url.startsWith("http") && apiKey.length >= 4;
      setConnStatus(ok ? "ok" : "fail");
      if (ok) toast.success("Connection successful");
      else toast.error("Could not reach endpoint. Check URL and key.");
    }, 900);
  };

  const dotColor = {
    ok: "bg-emerald-400",
    fail: "bg-red-400",
    testing: "bg-amber-400 animate-pulse",
    unknown: "bg-gray-500",
  }[connStatus];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">System</div>
        <h1 className="font-mono-display text-3xl font-extrabold mt-1">SETTINGS</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 border border-white/5 font-mono-display text-[11px]">
          <TabsTrigger value="connections" data-testid="settings-tab-connections">
            <Plug className="w-3.5 h-3.5 mr-1.5" /> Connections
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="settings-tab-notifications">
            <Bell className="w-3.5 h-3.5 mr-1.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="settings-tab-security">
            <Lock className="w-3.5 h-3.5 mr-1.5" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card className="glass rounded-xl p-6 space-y-5 max-w-2xl" data-testid="settings-connections-panel">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-400">OpenClaw URL</Label>
              <Input
                data-testid="settings-openclaw-url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white/5 border-white/10 mt-1 font-mono-term"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-400">API Key</Label>
              <Input
                data-testid="settings-api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-white/5 border-white/10 mt-1 font-mono-term"
                placeholder="sk-•••••••••••••"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} data-testid="settings-conn-status-dot"></span>
                <span className="text-gray-300 font-mono-term">
                  {connStatus === "ok" ? "Connected" : connStatus === "fail" ? "Disconnected" : connStatus === "testing" ? "Testing..." : "Not tested"}
                </span>
                {connStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {connStatus === "fail" && <XCircle className="w-4 h-4 text-red-400" />}
              </div>
              <Button
                data-testid="settings-test-connection-btn"
                onClick={testConnection}
                disabled={connStatus === "testing"}
                className="bg-blue-500 hover:bg-blue-400 text-white"
              >
                {connStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Test Connection
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="glass rounded-xl p-6 space-y-5 max-w-2xl" data-testid="settings-notifications-panel">
            {[
              { label: "Desktop notifications", v: desktop, set: setDesktop, t: "settings-toggle-desktop" },
              { label: "Sound alerts", v: sound, set: setSound, t: "settings-toggle-sound" },
              { label: "Email digests", v: email, set: setEmail, t: "settings-toggle-email" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm">{row.label}</div>
                  <div className="text-xs text-gray-500">Receive real-time updates from mission control</div>
                </div>
                <Switch checked={row.v} onCheckedChange={row.set} data-testid={row.t} />
              </div>
            ))}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider text-gray-400">Cost threshold</Label>
                <span className="font-mono-term text-sm text-emerald-400">${costThreshold[0]}</span>
              </div>
              <Slider
                data-testid="settings-cost-threshold"
                value={costThreshold}
                onValueChange={setCostThreshold}
                max={100}
                step={1}
              />
              <div className="text-[11px] text-gray-500 mt-2">Alert me when daily fleet spend exceeds this amount.</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="glass rounded-xl p-6 space-y-5 max-w-2xl" data-testid="settings-security-panel">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-400">Current password</Label>
              <Input
                data-testid="settings-current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="bg-white/5 border-white/10 mt-1 font-mono-term"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-400">New password</Label>
              <Input
                data-testid="settings-new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="bg-white/5 border-white/10 mt-1 font-mono-term"
              />
            </div>
            <Button
              data-testid="settings-change-pw-btn"
              onClick={() => {
                if (!currentPw || !newPw) return toast.error("Fill both fields");
                toast.success("Password updated (simulated)");
                setCurrentPw(""); setNewPw("");
              }}
              className="bg-blue-500 hover:bg-blue-400 text-white"
            >
              Update password
            </Button>

            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <div>
                <div className="text-sm">Two-factor authentication</div>
                <div className="text-xs text-gray-500">Require a code from your authenticator app on every login</div>
              </div>
              <Switch checked={twoFA} onCheckedChange={setTwoFA} data-testid="settings-toggle-2fa" />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
