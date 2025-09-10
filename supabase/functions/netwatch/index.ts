import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MikroTikCredentials {
  host: string;
  username: string;
  password: string;
}

interface NetwatchEntry {
  id: string;
  name: string;
  host: string;
  status: "up" | "down";
  since: string;
}

// Simple RouterOS API implementation for Deno
class RouterOSAPI {
  private host: string;
  private username: string;
  private password: string;

  constructor(host: string, username: string, password: string) {
    this.host = host;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<NetwatchEntry[]> {
    try {
      // For demo purposes, we'll simulate the RouterOS API connection
      // In a real implementation, you would use a proper RouterOS API library
      // or implement the full RouterOS API protocol
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return simulated netwatch data based on the host
      // In real implementation, this would come from actual RouterOS API
      const mockNetworkData: NetwatchEntry[] = [
        { 
          id: "1", 
          name: "Gateway Router", 
          host: "192.168.1.1", 
          status: Math.random() > 0.3 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
        { 
          id: "2", 
          name: "Core Switch", 
          host: "192.168.1.10", 
          status: Math.random() > 0.2 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
        { 
          id: "3", 
          name: "WiFi Access Point", 
          host: "192.168.1.20", 
          status: Math.random() > 0.4 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
        { 
          id: "4", 
          name: "Server Rack", 
          host: "192.168.1.100", 
          status: Math.random() > 0.1 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
        { 
          id: "5", 
          name: "Backup Router", 
          host: "192.168.1.2", 
          status: Math.random() > 0.2 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
        { 
          id: "6", 
          name: "Edge Firewall", 
          host: "192.168.1.254", 
          status: Math.random() > 0.3 ? "up" : "down", 
          since: new Date(Date.now() - Math.random() * 86400000).toISOString().slice(0, 16).replace('T', ' ')
        },
      ];

      // Validate credentials (basic simulation)
      if (!this.host || !this.username || !this.password) {
        throw new Error('Invalid credentials');
      }

      // Simulate authentication failure for certain credentials
      if (this.username === 'invalid' || this.password === 'invalid') {
        throw new Error('Authentication failed');
      }

      return mockNetworkData;
    } catch (error) {
      throw new Error(`RouterOS connection failed: ${error.message}`);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { host, username, password }: MikroTikCredentials = await req.json();

    if (!host || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing credentials. Host, username, and password are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connect to RouterOS API
    const routerAPI = new RouterOSAPI(host, username, password);
    const netwatchData = await routerAPI.connect();

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: netwatchData,
        host: host,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in netwatch function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to fetch netwatch data' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})