var express = require("express"), cors = require("cors"), secure = require("ssl-express-www");
const path = require('path');
const os = require('os');
const fs = require('fs');
const ptz = require('./function/index') 
const axios = require('axios')
const FormData = require('form-data');

var app = express();
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(cors());
app.use(secure);
app.use(express.static(path.join(__dirname, 'public')));
const port = 3000;

app.get('/stats', (req, res) => {
  const stats = {
    platform: os.platform(),
    architecture: os.arch(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    cpuModel: os.cpus()[0].model,
    numCores: os.cpus().length,
    loadAverage: os.loadavg(),
    hostname: os.hostname(),
    networkInterfaces: os.networkInterfaces(),
    osType: os.type(),
    osRelease: os.release(),
    userInfo: os.userInfo(),
    processId: process.pid,
    nodeVersion: process.version,
    execPath: process.execPath,
    cwd: process.cwd(),
    memoryUsage: process.memoryUsage()
  };
  res.json(stats);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,  'index.html'));
});

app.get('/api/ragbot', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ptz.ragBot(message);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk degreeGuru
app.get('/api/degreeguru', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ptz.degreeGuru(message);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk smartContract
app.get('/api/smartcontract', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ptz.smartContract(message);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk blackboxAIChat
app.get('/api/blackboxAIChat', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ptz.blackboxAIChat(message);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/speedtest', async (req, res) => {
  try {
    const result = await runSpeedTest();
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi speed test
async function runSpeedTest() {
  const startTime = performance.now();
  let uploadSpeed = 0;
  let ping = 0;
  let networkInfo = { location: 'N/A', org: 'N/A' };

  // upload test
  try {
    const url = 'https://speed.cloudflare.com/__up';
    const data = '0'.repeat(10 * 1024 * 1024);
    const response = await axios.post(url, data, {
      headers: { 'Content-Length': data.length },
      timeout: 30000
    });
    const duration = (performance.now() - startTime) / 1000;
    if (response.status === 200) {
      uploadSpeed = data.length / (duration || 1);
    }
  } catch (e) {
    throw new Error(`Upload test failed: ${e.message}`);
  }

  // ping test
  try {
    const start = performance.now();
    await axios.get('https://www.google.com', { timeout: 10000 });
    ping = Math.round(performance.now() - start);
  } catch (e) {
    ping = 0;
  }

  // network info
  try {
    const response = await axios.get('https://ipinfo.io/json', { timeout: 10000 });
    if (response.status === 200) {
      const data = response.data;
      networkInfo.location = `${data.city || 'N/A'}, ${data.country || 'N/A'}`;
      networkInfo.org = (data.org || 'N/A').replace('AS', '');
    }
  } catch (e) {
    networkInfo = { location: 'N/A', org: 'N/A' };
  }

  // format speed
  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec <= 0) return '0 Mbps';
    const mbits = (bytesPerSec * 8) / (1024 * 1024);
    return mbits >= 1 ? `${mbits.toFixed(1)} Mbps` : `${(mbits * 1000).toFixed(1)} Kbps`;
  };

  return {
    upload: formatSpeed(uploadSpeed),
    ping: `${ping}ms`,
    server: networkInfo.location,
    provider: networkInfo.org,
    test_duration: `${((performance.now() - startTime) / 1000).toFixed(1)} sec`,
    timestamp: new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '')
  };
}

app.get('/api/ssweb', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    
    const width = req.query.width || 1280;
    const height = req.query.height || 720;
    const full_page = req.query.full_page === 'true';
    const device_scale = req.query.device_scale || 1;
    
    const screenshotUrl = await ssweb(url, { 
      width: parseInt(width), 
      height: parseInt(height), 
      full_page: full_page, 
      device_scale: parseInt(device_scale) 
    });
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        url: screenshotUrl,
        parameters: {
          original_url: url,
          width: width,
          height: height,
          full_page: full_page,
          device_scale: device_scale
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi screenshot
async function ssweb(url, { width = 1280, height = 720, full_page = false, device_scale = 1 } = {}) {
  try {
    if (!url.startsWith('http')) throw new Error('Invalid url');
    if (isNaN(width) || isNaN(height) || isNaN(device_scale)) throw new Error('Width, height, and scale must be a number');
    if (typeof full_page !== 'boolean') throw new Error('Full page must be a boolean');

    const { data } = await axios.post(
      'https://gcp.imagy.app/screenshot/createscreenshot',
      {
        url: url,
        browserWidth: parseInt(width),
        browserHeight: parseInt(height),
        fullPage: full_page,
        deviceScaleFactor: parseInt(device_scale),
        format: 'png'
      },
      {
        headers: {
          'content-type': 'application/json',
          referer: 'https://imagy.app/full-page-screenshot-taker/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        }
      }
    );

    return data.fileUrl;
  } catch (error) {
    throw new Error(error.message);
  }
}

app.get("/api/gpt", async (req, res) => {
const text = req.query.text;

if (!text) {
return res.status(400).send("Parameter 'text' is required.");
}

try {
const requestData = {
operation: "chatExecute",
params: {
text: text,
languageId: "6094f9b4addddd000c04c94b",
toneId: "60572a649bdd4272b8fe358c",
voiceId: ""
}
};

const config = {
headers: {
Accept: "application/json, text/plain, */*",
Authentication: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2MTZjMjFhMGE1NTNiNjE1MDhmNWIxOSIsImlhdCI6MTcxMjc2NzUxNH0.qseE0iNl-4bZrpQoB-zxVsc-pz13l3JOKkg4u6Y08OY",
"Content-Type": "application/json"
}
};
let {data} = await axios.post("https://api.rytr.me/", requestData, config)
data.data.content = data.data.content.replace(/<\/?p[^>]*>/g, '');
res.json(data);
} catch (error) {
console.error(error);
res.status(500).send("Internal Server Error");
}
});

app.get('/api/gpt-oss', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    
    const response = await gptOss(message);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi random user ID
const randomUserId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Fungsi GPT OSS
async function gptOss(text) {
  try {
    if (!text) throw new Error('Pesan tidak boleh kosong');
    
    const { data: rawSSE, headers } = await axios.post(
      'https://api.gpt-oss.com/chatkit',
      {
        op: 'threads.create',
        params: {
          input: {
            text,
            content: [{ type: 'input_text', text }],
            quoted_text: '',
            attachments: []
          }
        }
      },
      {
        headers: {
          authority: 'api.gpt-oss.com',
          accept: 'text/event-stream',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          origin: 'https://gpt-oss.com',
          cookie: `user_id=${randomUserId()}`,
          referer: 'https://gpt-oss.com/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
          'x-selected-model': 'gpt-oss-120b'
        },
        responseType: 'text'
      }
    );

    let events = rawSSE
      .split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6).trim())
      .filter(Boolean)
      .map(str => {
        try { return JSON.parse(str); } catch { return null; }
      })
      .filter(Boolean);

    let response = events
      .filter(e => e.type === 'thread.item_done' && e.item?.type === 'assistant_message')
      .map(e => e.item.content?.[0]?.text)
      .filter(Boolean)
      .join('\n\n');
    
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
}

// Endpoint untuk Download douyin
app.get('/api/download-douyin', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await downloadDouyinVideo(url);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi downloadDouyinVideo
async function downloadDouyinVideo(videoUrl) {
    try {
        const token = await getDownloadToken();
        const hash = calculateHash(videoUrl, 'aio-dl');

        const formData = new URLSearchParams();
        formData.append('url', videoUrl);
        formData.append('token', token);
        formData.append('hash', hash);

        const response = await axios.post('https://snapdouyin.app/wp-json/mx-downloader/video-data/',
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error downloading Douyin video:', error.message);
        throw error;
    }
}

// endpoint aio
app.get('/api/aio-downloader', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await aio(url);
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi aio downloader
async function aio(url) {
    try {
        if (!url || !url.includes('https://')) throw new Error('Url is required');
        
        const { data } = await axios.post('https://auto-download-all-in-one.p.rapidapi.com/v1/social/autolink', {
            url: url
        }, {
            headers: {
                'accept-encoding': 'gzip',
                'cache-control': 'no-cache',
                'content-type': 'application/json; charset=utf-8',
                referer: 'https://auto-download-all-in-one.p.rapidapi.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 OPR/78.0.4093.184',
                'x-rapidapi-host': 'auto-download-all-in-one.p.rapidapi.com',
                'x-rapidapi-key': '1dda0d29d3mshc5f2aacec619c44p16f219jsn99a62a516f98'
            }
        });
        
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Fungsi untuk menghitung hash
function calculateHash(url, salt) {
    const urlBase64 = Buffer.from(url, 'utf-8').toString('base64');
    const saltBase64 = Buffer.from(salt, 'utf-8').toString('base64');
    return urlBase64 + (url.length + 1000) + saltBase64;
}

// Fungsi untuk mendapatkan token download
async function getDownloadToken() {
    try {
        const response = await axios.get('https://snapdouyin.app/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);

        const tokenInput = $('input#token');
        if (tokenInput.length > 0) {
            return tokenInput.attr('value');
        } else {
            throw new Error('Token tidak ditemukan di halaman web');
        }
    } catch (error) {
        console.error('Error fetching download token:', error.message);
        throw error;
    }
}

app.get('/api/igdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    
    const response = await igdl(url);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi Instagram Downloader
async function igdl(url) {
  const base_url = 'https://api.instantdp.com/igdl';
  
  const options = {
    method: 'POST',
    url: base_url,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://www.instantdp.com/instagram'
    },
    data: {
      url: url
    }
  };

  try {
    const res = await axios(options);
    return res.data;
  } catch (e) {
    throw new Error(`${e.message}`);
  }
}

app.get('/api/tiktok', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        error: 'Parameter "url" tidak ditemukan',
        example: '/api/tiktok?url=https://vt.tiktok.com/ABC123/'
      });
    }
    
    const response = await sstikDownload(url);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: response
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function sstikDownload(url) {
  try {
    const response = await axios.get(`https://ssstik.io/abc?url=${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    return response.data;
  } catch (e) {
    try {
      const response = await axios.get(`https://tikwm.com/api?url=${encodeURIComponent(url)}`);
      const data = response.data;
      
      const result = {
        type: data.images ? 'image' : 'video',
        author: data.author || null,
        title: data.title || null,
        duration: data.duration || 0,
        created_at: data.createTime || null
      };
      
      if (data.images) {
        result.media = data.images.map(img => ({
          url: img,
          type: 'image'
        }));
      } else if (data.play) {
        result.media = [{
          url: data.play,
          type: 'video',
          quality: 'HD',
          watermark: false
        }];
        
        if (data.wmplay) {
          result.media.push({
            url: data.wmplay,
            type: 'video',
            quality: 'HD',
            watermark: true
          });
        }
      }
      
      return result;
    } catch (err) {
      try {
        const response = await axios.get(`https://savetik.co/api/ajaxSearch?q=${encodeURIComponent(url)}`);
        return response.data;
      } catch (error2) {
        throw new Error(`Gagal mendownload konten TikTok: ${err.message}`);
      }
    }
  }
}

async function tiktokImageDownload(url) {
  try {
    const response = await axios.get(`https://www.tikwm.com/api?url=${encodeURIComponent(url)}`);
    const data = response.data;
    
    if (!data.images || data.images.length === 0) {
      throw new Error('Tidak ditemukan gambar dalam postingan ini');
    }
    
    return {
      type: 'image',
      author: data.author,
      title: data.title,
      images: data.images.map((img, index) => ({
        url: img,
        filename: `tiktok_image_${index + 1}.jpg`,
        size: null
      })),
      count: data.images.length,
      created_at: data.createTime
    };
  } catch (error) {
    throw new Error(`Gagal mendownload gambar TikTok: ${error.message}`);
  }
}
});

// endpoint ero
const eroApis = [
  {
    name: 'Sumber 1',
    url: 'https://nekobot.xyz/api/image?type=ero',
    parser: (data) => data.success ? data.message : null
  },
  {
    name: 'Sumber 2',
    url: 'https://api.waifu.pics/nsfw/waifu',
    parser: (data) => data.url || null
  },
  {
    name: 'Sumber 3',
    url: 'https://nekos.life/api/v2/img/ero',
    parser: (data) => data.url || null
  },
  {
    name: 'Sumber 4',
    url: 'https://purrbot.site/api/img/nsfw/neko/gif',
    parser: (data) => data.link || null
  },
  {
    name: 'Sumber 5',
    url: 'https://hmtai.herokuapp.com/nsfw/waifu',
    parser: (data) => data.url || null
  }
];

// Fungsi untuk mencoba API
async function tryEroApi(api) {
  try {
    const response = await axios.get(api.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const url = api.parser(response.data);
    return {
      success: !!url,
      url: url,
      source: api.name
    };
  } catch (error) {
    return { success: false, url: null, source: api.name };
  }
}

// Endpoint utama
app.get('/api/ero', async (req, res) => {
  try {
    // Peringatan dewasa
    const warningHeader = '⚠️ KONTEN DEWASA 18+ ⚠️';
    
    // Coba dari semua sumber
    let imageUrl = null;
    let source = '';
    
    for (const api of eroApis) {
      try {
        console.log(`[ERO API] Trying source: ${api.name}`);
        const result = await tryEroApi(api);
        
        if (result.success && result.url) {
          imageUrl = result.url;
          source = result.source;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!imageUrl) {
      return res.status(503).json({
        status: 503,
        creator: "Geraldo",
        warning: warningHeader,
        message: "Tidak dapat menemukan konten saat ini. Semua sumber tidak tersedia.",
        data: null
      });
    }

    // Return hasil
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      warning: warningHeader,
      disclaimer: "Konten ini hanya untuk usia 18+ dan digunakan atas tanggung jawab pribadi.",
      source: source,
      timestamp: new Date().toISOString(),
      data: {
        url: imageUrl,
        type: 'image/jpeg',
        proxy_url: `/api/ero-proxy?url=${encodeURIComponent(imageUrl)}`
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 500,
      creator: "Geraldo",
      warning: '⚠️ KONTEN DEWASA 18+ ⚠️',
      error: error.message,
      data: null
    });
  }
});

// Endpoint proxy untuk menghindari CORS dan melacak penggunaan
app.get('/api/ero-proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
      return res.status(400).send('URL tidak valid');
    }

    // Log penggunaan (opsional)
    console.log(`[ERO PROXY] Accessed from IP: ${req.ip}`);
    
    // Get image via proxy
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://google.com/'
      },
      timeout: 10000
    });

    // Set headers untuk cache dan content-type
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Warning': '⚠️ KONTEN DEWASA 18+ ⚠️'
    });

    response.data.pipe(res);
    
  } catch (error) {
    console.error('[ERO PROXY] Error:', error.message);
    res.status(500).send('Gagal memuat gambar');
  }
});

// Endpoint untuk random dengan jumlah tertentu
app.get('/api/ero/random', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 1, 5); // Max 5
    const results = [];
    
    for (let i = 0; i < count; i++) {
      // Acak urutan API
      const shuffledApis = [...eroApis].sort(() => Math.random() - 0.5);
      
      for (const api of shuffledApis) {
        const result = await tryEroApi(api);
        if (result.success) {
          results.push({
            url: result.url,
            source: result.source,
            index: i + 1
          });
          break;
        }
      }
      
      // Delay antar request
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      warning: '⚠️ KONTEN DEWASA 18+ ⚠️',
      disclaimer: "Konten ini hanya untuk usia 18+ dan digunakan atas tanggung jawab pribadi.",
      timestamp: new Date().toISOString(),
      data: {
        total: results.length,
        images: results
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 500,
      creator: "Geraldo",
      warning: '⚠️ KONTEN DEWASA 18+ ⚠️',
      error: error.message,
      data: null
    });
  }
});

// Endpoint info (tanpa mengungkap sumber)
app.get('/api/ero/info', (req, res) => {
  res.status(200).json({
    status: 200,
    creator: "Geraldo",
    warning: '⚠️ KONTEN DEWASA 18+ ⚠️',
    disclaimer: "Konten ini hanya untuk usia 18+ dan digunakan atas tanggung jawab pribadi.",
    endpoints: {
      single: '/api/ero - Dapatkan 1 gambar random',
      multiple: '/api/ero/random?count=3 - Dapatkan beberapa gambar (max 5)',
      proxy: '/api/ero-proxy?url=URL - Proxy untuk gambar'
    },
    limits: {
      max_per_request: 5,
      cache_duration: '1 jam',
      age_restriction: '18+'
    },
    notice: "Sumber API dirahasiakan untuk keamanan dan keberlanjutan layanan."
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Ada kesalahan pada server');
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
