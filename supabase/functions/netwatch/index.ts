// supabase/functions/netwatch/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Buffer } from 'https://deno.land/std@0.168.0/io/buffer.ts';

// Header CORS untuk mengizinkan frontend Anda mengakses fungsi ini
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper class untuk menangani komunikasi RouterOS API
class RouterOSAPI {
  private conn: Deno.Conn | null = null;
  private debug = false;

  private log(message: string) {
    if (this.debug) {
      console.log(message);
    }
  }

  // Fungsi untuk mengenkode panjang kata/perintah sesuai protokol API
  private encodeLength(length: number): Uint8Array {
    if (length < 0x80) {
      return new Uint8Array([length]);
    }
    if (length < 0x4000) {
      return new Uint8Array([(length >> 8) | 0x80, length & 0xff]);
    }
    if (length < 0x200000) {
      return new Uint8Array([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
    }
    if (length < 0x10000000) {
      return new Uint8Array([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
    }
    return new Uint8Array([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  }

  // Fungsi untuk menulis data ke socket
  private async writeWord(word: string): Promise<void> {
    if (!this.conn) throw new Error("Not connected");
    const encodedWord = new TextEncoder().encode(word);
    const encodedLength = this.encodeLength(encodedWord.length);
    await this.conn.write(encodedLength);
    await this.conn.write(encodedWord);
    this.log(`>>> ${word}`);
  }

  // Fungsi untuk membaca respons dari socket
  private async readSentence(): Promise<string[]> {
      if (!this.conn) throw new Error("Not connected");
      const sentence = [];
      while (true) {
          const firstByte = new Uint8Array(1);
          await this.conn.read(firstByte);
          let length: number;
          // Logika untuk mendekode panjang kata dari respons
          if ((firstByte[0] & 0x80) === 0x00) {
              length = firstByte[0];
          } else if ((firstByte[0] & 0xC0) === 0x80) {
              const secondByte = new Uint8Array(1);
              await this.conn.read(secondByte);
              length = ((firstByte[0] & 0x3F) << 8) + secondByte[0];
          } else if ((firstByte[0] & 0xE0) === 0xC0) {
              const nextBytes = new Uint8Array(2);
              await this.conn.read(nextBytes);
              length = ((firstByte[0] & 0x1F) << 16) + (nextBytes[0] << 8) + nextBytes[1];
          } else if ((firstByte[0] & 0xF0) === 0xE0) {
              const nextBytes = new Uint8Array(3);
              await this.conn.read(nextBytes);
              length = ((firstByte[0] & 0x0F) << 24) + (nextBytes[0] << 16) + (nextBytes[1] << 8) + nextBytes[2];
          } else { // Asumsi 5 byte length
              const nextBytes = new Uint8Array(4);
              await this.conn.read(nextBytes);
              length = (nextBytes[0] << 24) + (nextBytes[1] << 16) + (nextBytes[2] << 8) + nextBytes[3];
          }

          const wordBuffer = new Buffer();
          if (length > 0) {
            const tempBuffer = new Uint8Array(length);
            await this.conn.read(tempBuffer);
            wordBuffer.write(tempBuffer);
          }

          const word = new TextDecoder().decode(wordBuffer.bytes());
          this.log(`<<< ${word}`);
          sentence.push(word);
          if (word === '!done' || word === '!fatal' || word.endsWith('\x00')) {
              break;
          }
      }
      return sentence;
  }
  
  // Fungsi utama untuk koneksi dan login
  public async connect(host: string, user: string, pass: string): Promise<boolean> {
    try {
      this.conn = await Deno.connect({ hostname: host, port: 8728 }); // Port default RouterOS API
      
      // Proses login (tanpa challenge-response untuk simplisitas awal)
      await this.writeWord('/login');
      await this.writeWord(`=name=${user}`);
      await this.writeWord(`=password=${pass}`);
      await this.conn.write(new Uint8Array([0])); // Akhiri kalimat

      const response = await this.readSentence();
      if (response.includes("!done")) {
        this.log("Login successful");
        return true;
      }
      // Tambahan: Handle login challenge jika diperlukan (lebih kompleks)
      
      this.log("Login failed");
      this.disconnect();
      return false;
    } catch (error) {
      this.log(`Connection error: ${error.message}`);
      return false;
    }
  }

  // Fungsi untuk menjalankan perintah
  public async comm(command: string): Promise<any[]> {
    if (!this.conn) throw new Error("Not connected");
    await this.writeWord(command);
    await this.conn.write(new Uint8Array([0])); // Akhiri kalimat
    
    const response = await this.readSentence();
    
    // Parsing sederhana dari respons ke format JSON
    const result = [];
    let currentObject = {};
    for (const word of response) {
      if (word === '!re') {
        if (Object.keys(currentObject).length > 0) {
          result.push(currentObject);
        }
        currentObject = {};
      } else if (word.startsWith('=')) {
        const [, key, value] = word.match(/^=([^=]+)=(.*)$/) || [];
        if (key) {
          currentObject[key] = value;
        }
      }
    }
    if (Object.keys(currentObject).length > 0) {
      result.push(currentObject);
    }
    
    return result;
  }

  public disconnect() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
      this.log("Disconnected.");
    }
  }
}


// Server utama yang menangani request dari frontend
serve(async (req: Request) => {
  // Handle preflight request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { host, username, password } = await req.json();

    if (!host || !username) {
      throw new Error("Host and username are required.");
    }

    const api = new RouterOSAPI();
    const isConnected = await api.connect(host, username, password || '');

    if (!isConnected) {
      throw new Error("Failed to connect to the MikroTik router. Check credentials and network access.");
    }

    const netwatchData = await api.comm('/tool/netwatch/print');
    api.disconnect();

    return new Response(JSON.stringify({ success: true, data: netwatchData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
