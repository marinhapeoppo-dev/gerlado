var express = require("express"), cors = require("cors"), secure = require("ssl-express-www");
const path = require('path');
const os = require('os');
const fs = require('fs');
const ptz = require('./function/index') 
const axios = require('axios')

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
app.get('/api/nswf', async (req, res) => {
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

app.use((req, res, next) => {
  res.status(404).send("Halaman tidak ditemukan");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Ada kesalahan pada server');
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
