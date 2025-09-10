import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Search, RefreshCw, Network, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NetwatchEntry {
  id: string;
  name: string;
  host: string;
  status: "up" | "down";
  since: string;
}

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [netwatchData, setNetwatchData] = useState<NetwatchEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();


  const fetchNetworkData = async () => {
    setIsRefreshing(true);
    
    try {
      // Get MikroTik credentials from localStorage
      const credentialsStr = localStorage.getItem("mikrotikCredentials");
      if (!credentialsStr) {
        throw new Error("No MikroTik credentials found");
      }

      const credentials = JSON.parse(credentialsStr);
      
      // Call Supabase Edge Function
      const response = await fetch('https://jsqwcnzytqosslsxtyvk.supabase.co/functions/v1/netwatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXdjbnp5dHFvc3Nsc3h0eXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Nzc4OTUsImV4cCI6MjA3MzA1Mzg5NX0.rZ01hkYLBu1DAK8V3j5r7V2R6tcfQqwr4x6yRvOefxI`
        },
        body: JSON.stringify({
          host: credentials.host,
          username: credentials.username,
          password: credentials.password
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch netwatch data');
      }

      setNetwatchData(result.data);
      setLastUpdate(new Date());
      
      toast({
        title: "Data Updated",
        description: `Successfully fetched data from ${credentials.host}`,
      });

    } catch (error) {
      console.error('Error fetching network data:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to fetch network data",
        variant: "destructive",
      });
      
      // Fallback to empty data on error
      setNetwatchData([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem("isAuthenticated");
    if (!isAuth) {
      navigate("/");
      return;
    }

    // Get MikroTik credentials to display connection info
    const credentialsData = localStorage.getItem("mikrotikCredentials");
    
    // Initial data fetch
    fetchNetworkData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchNetworkData, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("mikrotikCredentials");
    toast({
      title: "Disconnected",
      description: "Disconnected from MikroTik router",
    });
    navigate("/");
  };

  const filteredData = netwatchData.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.host.includes(searchTerm)
  );

  const onlineCount = netwatchData.filter(entry => entry.status === "up").length;
  const offlineCount = netwatchData.filter(entry => entry.status === "down").length;

  // Get connection info
  const mikrotikCredentials = JSON.parse(localStorage.getItem("mikrotikCredentials") || '{"host":"Unknown"}');

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              MikroTik Monitor
            </h1>
            <p className="text-muted-foreground text-sm">
              Connected to: <span className="font-mono text-primary">{mikrotikCredentials.host}</span> • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNetworkData}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 fade-in">
        <Card className="card-monitoring">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">
              Devices responding
            </p>
          </CardContent>
        </Card>

        <Card className="card-monitoring">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Devices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{offlineCount}</div>
            <p className="text-xs text-muted-foreground">
              Devices not responding
            </p>
          </CardContent>
        </Card>

        <Card className="card-monitoring">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monitored</CardTitle>
            <Network className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{netwatchData.length}</div>
            <p className="text-xs text-muted-foreground">
              Total network devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Network Devices Table */}
      <Card className="card-monitoring fade-in">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Network Devices</CardTitle>
              <CardDescription>
                Real-time monitoring of your MikroTik network devices
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64 bg-input border-border"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Device Name</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Host</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Since</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((device) => (
                  <tr key={device.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className={device.status === 'up' ? 'status-dot-online' : 'status-dot-offline'} />
                        <Badge 
                          variant={device.status === 'up' ? 'default' : 'destructive'}
                          className={device.status === 'up' ? 'bg-success text-success-foreground' : ''}
                        >
                          {device.status.toUpperCase()}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-2 font-medium">{device.name}</td>
                    <td className="py-4 px-2 text-muted-foreground font-mono text-sm">{device.host}</td>
                    <td className="py-4 px-2 text-muted-foreground text-sm">{device.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No devices found matching your search criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;