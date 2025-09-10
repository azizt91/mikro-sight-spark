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
      if (!this.host || !this.username || !this.password) {
        throw new Error('Invalid credentials');
      }

      // Build possible REST endpoints. We try HTTPS first, then HTTP.
      const endpoints: string[] = [];
      const cleanHost = this.host.replace(/\/$/, '');
      if (cleanHost.startsWith('http://') || cleanHost.startsWith('https://')) {
        endpoints.push(`${cleanHost}/rest/tool/netwatch`);
      } else {
        endpoints.push(`https://${cleanHost}/rest/tool/netwatch`);
        endpoints.push(`http://${cleanHost}/rest/tool/netwatch`);
      }

      const authHeader = `Basic ${btoa(`${this.username}:${this.password}`)}`;

      let lastError: unknown = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status} from ${url}: ${text?.slice(0, 200)}`);
          }

          const raw = await res.json();
          const items = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);

          const mapped: NetwatchEntry[] = items
            .map((item: any, idx: number) => ({
              id: item['.id'] || item.id || String(idx + 1),
              name: item.comment || item.name || item.host || `Device ${idx + 1}`,
              host: item.host || item.address || '',
              status: (item.status === 'up' || item.status === true) ? 'up' : 'down',
              since: item.since || item['since-time'] || new Date().toISOString().slice(0, 16).replace('T', ' '),
            }))
            .filter((d: NetwatchEntry) => !!d.host);

          return mapped;
        } catch (err) {
          lastError = err;
          // Try the next protocol/endpoint
        }
      }

      throw new Error(`RouterOS REST API request failed: ${(lastError as Error)?.message || lastError}`);
    } catch (error) {
      throw new Error(`RouterOS connection failed: ${(error as Error).message}`);
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