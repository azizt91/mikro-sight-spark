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

  // Mock data - in real app, this would come from your Node.js backend
  const mockData: NetwatchEntry[] = [
    { id: "1", name: "Gateway Router", host: "192.168.1.1", status: "up", since: "2024-01-15 08:30" },
    { id: "2", name: "Core Switch", host: "192.168.1.10", status: "up", since: "2024-01-15 08:30" },
    { id: "3", name: "WiFi Access Point", host: "192.168.1.20", status: "down", since: "2024-01-15 14:22" },
    { id: "4", name: "Server Rack", host: "192.168.1.100", status: "up", since: "2024-01-15 08:30" },
    { id: "5", name: "Backup Router", host: "192.168.1.2", status: "up", since: "2024-01-15 08:30" },
    { id: "6", name: "Edge Firewall", host: "192.168.1.254", status: "down", since: "2024-01-15 15:45" },
  ];

  const fetchNetworkData = async () => {
    setIsRefreshing(true);
    
    // Simulate API call to Node.js backend
    setTimeout(() => {
      // In real app: const response = await fetch('/api/netwatch');
      setNetwatchData(mockData);
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem("isAuthenticated");
    if (!isAuth) {
      navigate("/");
      return;
    }

    // Initial data fetch
    fetchNetworkData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchNetworkData, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  };

  const filteredData = netwatchData.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.host.includes(searchTerm)
  );

  const onlineCount = netwatchData.filter(entry => entry.status === "up").length;
  const offlineCount = netwatchData.filter(entry => entry.status === "down").length;

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
              Last updated: {lastUpdate.toLocaleTimeString()}
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