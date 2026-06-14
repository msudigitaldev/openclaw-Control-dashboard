import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wifi, RefreshCw, Shield, Bell, Link2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function Settings() {
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState({ connected: false });
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [costThreshold, setCostThreshold] = useState("5");

  useEffect(() => {
    api.get("/bridge/status").then((r) => {
      setBridgeStatus(r.data);
      if (r.data.gateway_url) setGatewayUrl(r.data.gateway_url);
      if (r.data.has_api_key) setApiKey("***");
    }).catch(() => {});
  }, []);

  const handleConfigure = async () => {
    if (!gatewayUrl) return toast.error("Enter OpenClaw Gateway URL");
    try {
      const r = await api.post("/bridge/configure", {
        gateway_url: gatewayUrl,
        api_key: apiKey === "***" ? "" : apiKey,
      });
      setBridgeStatus(r.data);
      if (r.data.connected) {
        toast.success("Connected! Latency: " + r.data.latency_ms + "ms");
      } else {
        toast.warning("Saved but could not connect. Check URL.");
      }
    } catch (err) {
      toast.error("Failed: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.post("/bridge/test");
      if (r.data.connected) {
        toast.success("Connection OK! " + r.data.latency_ms + "ms");
        setBridgeStatus((s) => ({ ...s, connected: true, latency_ms: r.data.latency_ms }));
      } else {
        toast.error("Failed: " + (r.data.error || "Unknown"));
      }
    } catch { toast.error("Test failed"); }
    finally { setTesting(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await api.post("/bridge/sync");
      toast.success("Synced " + r.data.synced + " agents!");
    } catch (err) { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-mono-display">Configuration</div>
        <h1 className="font-mono-display text-3xl font-extrabold mt-1">SETTINGS</h1>
      </div>
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/5 font-mono-display text-[11px]">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Link2 className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="font-mono-display text-lg font-bold">OpenClaw Gateway</h2>
                <p className="text-xs text-gray-500">Connect to your OpenClaw instance</p>
              </div>
              <div className="ml-auto">
                {bridgeStatus.connected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-400">Gateway URL</Label>
                <Input data-testid="gateway-url-input" placeholder="http://your-server-ip:3000" value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} className="bg-white/5 border-white/10 mt-1.5 font-mono-term" />
                <p className="text-[10px] text-gray-600 mt-1">Your OpenClaw gateway URL</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-400">API Key</Label>
                <Input data-testid="api-key-input" type="password" placeholder="Optional" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-white/5 border-white/10 mt-1.5 font-mono-term" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button data-testid="save-config-btn" onClick={handleConfigure} className="bg-blue-500 hover:bg-blue-400 text-white">
                  <Link2 className="w-4 h-4 mr-1.5" /> Save & Connect
                </Button>
                <Button data-testid="test-connection-btn" variant="outline" onClick={handleTest} disabled={testing} className="border-white/10 text-white hover:bg-white/5">
                  {testing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wifi className="w-4 h-4 mr-1.5" />}
                  Test
                </Button>
                <Button data-testid="sync-agents-btn" variant="outline" onClick={handleSync} disabled={syncing || !bridgeStatus.connected} className="border-white/10 text-white hover:bg-white/5">
                  {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                  Sync Agents
                </Button>
              </div>
              {bridgeStatus.connected && (
                <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Latency</div>
                      <div className="font-mono-term text-emerald-400">{bridgeStatus.latency_ms}ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Gateway</div>
                      <div className="font-mono-term text-gray-300 truncate">{bridgeStatus.gateway_url}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Last Sync</div>
                      <div className="font-mono-term text-gray-300">
                        {bridgeStatus.last_sync ? new Date(bridgeStatus.last_sync * 1000).toLocaleTimeString() : "Never"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="font-mono-display text-lg font-bold">Notifications</h2>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">Desktop Notifications</div><div className="text-xs text-gray-500">Browser push for events</div></div>
                <Switch checked={desktopNotif} onCheckedChange={setDesktopNotif} />
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">Sound Alerts</div><div className="text-xs text-gray-500">Play sound on completion</div></div>
                <Switch checked={soundNotif} onCheckedChange={setSoundNotif} />
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">Email on Error</div><div className="text-xs text-gray-500">Email when agent fails</div></div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-400">Cost Alert ($/day)</Label>
                <Input type="number" value={costThreshold} onChange={(e) => setCostThreshold(e.target.value)} className="bg-white/5 border-white/10 mt-1.5 w-32 font-mono-term" />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-purple-400" />
              <h2 className="font-mono-display text-lg font-bold">Security</h2>
            </div>
            <div className="space-y-5">
              <div><Label className="text-xs uppercase tracking-wider text-gray-400">Current Password</Label><Input type="password" className="bg-white/5 border-white/10 mt-1.5" placeholder="Current" /></div>
              <div><Label className="text-xs uppercase tracking-wider text-gray-400">New Password</Label><Input type="password" className="bg-white/5 border-white/10 mt-1.5" placeholder="New" /></div>
              <Button className="bg-purple-500 hover:bg-purple-400 text-white">Update Password</Button>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div><div className="text-sm font-medium">Two-Factor Auth</div><div className="text-xs text-gray-500">Extra security</div></div>
                <Switch />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
