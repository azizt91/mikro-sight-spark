import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [host, setHost] = useState("192.168.1.1");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate MikroTik connection - in real app, this would call your Node.js backend
    // Backend will attempt to connect to MikroTik with these credentials
    setTimeout(() => {
      if (host && username && password) {
        // Store MikroTik credentials for API calls
        const credentials = { host, username, password };
        localStorage.setItem("mikrotikCredentials", JSON.stringify(credentials));
        localStorage.setItem("isAuthenticated", "true");
        
        toast({
          title: "MikroTik Connected",
          description: `Successfully connected to ${host}`,
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Connection Failed",
          description: "Please fill in all MikroTik connection details",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 fade-in">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Network className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            MikroTik Monitor
          </h1>
          <p className="text-muted-foreground">
            Network Monitoring Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="card-monitoring">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Connect to MikroTik</CardTitle>
            <CardDescription className="text-center">
              Enter your MikroTik router credentials to access netwatch monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="host">MikroTik Host/IP</Label>
                <Input
                  id="host"
                  type="text"
                  placeholder="192.168.1.1"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="bg-input border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter MikroTik password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-glow transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Connecting to MikroTik...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Connect & Monitor
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Connection Info */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Enter your MikroTik router connection details</p>
          <p className="text-xs">Credentials will be sent to your Node.js backend for RouterOS API connection</p>
        </div>
      </div>
    </div>
  );
};

export default Login;