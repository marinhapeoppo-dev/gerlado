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

// Middleware untuk tracking requests
app.use((req, res, next) => {
  // Skip untuk endpoint tertentu yang tidak perlu di-track
  const skipPaths = ['/favicon.ico', '/robots.txt'];
  if (skipPaths.includes(req.path)) {
    return next();
  }
  
  // Simpan original send function
  const originalSend = res.send;
  
  // Override send function untuk track response
  res.send = function(body) {
    // Track response
    trackResponseToTelegram(req, res.statusCode, body);
    
    // Call original send
    originalSend.call(this, body);
  };
  
  next();
});

// Fungsi untuk track response ke Telegram
async function trackResponseToTelegram(req, statusCode, body) {
  try {
    // Token dan Chat ID Telegram langsung di sini
    const TELEGRAM_BOT_TOKEN = '8474048261:AAEtiri8WmeT5WM3UEJStxi7HhK6W-yjFww';
    const TELEGRAM_CHAT_ID = '7565734815';
    
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    const endpoint = req.originalUrl;
    const tanggal = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Format response body
    let responseBody = '';
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        responseBody = JSON.stringify(parsed, null, 2);
      } else if (typeof body === 'object') {
        responseBody = JSON.stringify(body, null, 2);
      } else {
        responseBody = String(body);
      }
    } catch (e) {
      responseBody = String(body).substring(0, 1000);
    }
    
    // Potong response jika terlalu panjang
    if (responseBody.length > 1500) {
      responseBody = responseBody.substring(0, 1500) + '...\n[Response terlalu panjang, dipotong]';
    }
    
    const message = `📡 REQUEST BARU MASUK

🌐 IP: \`${ip}\`
📁 ENDPOINT: \`${req.method} ${endpoint}\`
✅ STATUS: \`${statusCode}\`

📦 RESPONSE JSON:
\`\`\`JSON
${responseBody}
\`\`\`

📅 TANGGAL: ${tanggal}

━━━━━━━━━━━━━━━━`;

    // Kirim ke Telegram
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    // Tidak ada console.log atau console.error
  }
}

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

// Endpoint untuk Image Generation
app.get('/api/image-generate', async (req, res) => {
  try {
    const prompt = req.query.prompt;
    const model = req.query.model || 'dalle3';
    const ratio = req.query.ratio || '1:1';
    
    if (!prompt) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "prompt" tidak ditemukan'
      });
    }
    
    const imageUrl = await generateImage(prompt, model, ratio);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Endpoint untuk list model yang tersedia
app.get('/api/image-models', (req, res) => {
  const models = [
    { id: 'ai4chat', name: 'AI4Chat' },
    { id: 'animaginexl31', name: 'Animagine XL 3.1' },
    { id: 'animaginexl40', name: 'Animagine XL 4.0' },
    { id: 'cartoony', name: 'Cartoony Anime' },
    { id: 'dalle2', name: 'DALL-E 2' },
    { id: 'dalle3', name: 'DALL-E 3' },
    { id: 'dreamshaperxl', name: 'Dreamshaper XL' },
    { id: 'epicrealism', name: 'Epic Realism' },
    { id: 'fluxdev', name: 'Flux Dev' },
    { id: 'fluxschnell', name: 'Flux Schnell' },
    { id: 'holymix', name: 'Holymix' },
    { id: 'illumiyume', name: 'Illumiyume XL' },
    { id: 'illustriousme', name: 'Illustrious ME v6' },
    { id: 'illustriousxl', name: 'Illustrious XL 1.0' },
    { id: 'imagen3', name: 'Imagen 3.0 Fast' },
    { id: 'imagen4', name: 'Imagen 4.0 Fast' },
    { id: 'juggernautxl', name: 'Juggernaut XL' },
    { id: 'majicmix', name: 'Majicmix Realistic' },
    { id: 'newreality', name: 'New Reality' },
    { id: 'noobaixl', name: 'NoobAI XL' },
    { id: 'noobai', name: 'NoobAI' },
    { id: 'pixarcartoon', name: 'Pixar Cartoon' },
    { id: 'ponyrealism', name: 'Pony Realism' },
    { id: 'seaartinfinity', name: 'SeaArt Infinity' },
    { id: 'seaartrealism', name: 'SeaArt Realism' },
    { id: 'stablediffusion', name: 'Stable Diffusion 3.5' },
    { id: 'writecream', name: 'Writecream' },
    { id: 'yayoimix', name: 'Yayoimix' }
  ];
  
  res.json({
    status: 200,
    creator: "Geraldo",
    data: {
      models: models,
      ratios: ['1:1', '16:9', '9:16'],
      example: '/api/image-generate?prompt=beautiful anime girl&model=dalle3&ratio=1:1'
    }
  });
});

// Fungsi Generate Image
async function generateImage(prompt, model = 'dalle3', ratio = '1:1') {
  const apiMap = {
    'ai4chat': 'https://api.nekolabs.web.id/image-generation/ai4chat',
    'animaginexl31': 'https://api.nekolabs.web.id/image-generation/animagine/xl-3.1',
    'animaginexl40': 'https://api.nekolabs.web.id/image-generation/animagine/xl-4.0',
    'cartoony': 'https://api.nekolabs.web.id/image-generation/cartoony-anime',
    'dalle2': 'https://api.nekolabs.web.id/image-generation/dall-e/2',
    'dalle3': 'https://api.nekolabs.web.id/image-generation/dall-e/3',
    'dreamshaperxl': 'https://api.nekolabs.web.id/image-generation/dreamshaper-xl',
    'epicrealism': 'https://api.nekolabs.web.id/image-generation/epic-realism',
    'fluxdev': 'https://api.nekolabs.web.id/image-generation/flux/dev',
    'fluxschnell': 'https://api.nekolabs.web.id/image-generation/flux/schnell',
    'holymix': 'https://api.nekolabs.web.id/image-generation/holymix',
    'illumiyume': 'https://api.nekolabs.web.id/image-generation/illumiyume-xl',
    'illustriousme': 'https://api.nekolabs.web.id/image-generation/illustrious/me-v6',
    'illustriousxl': 'https://api.nekolabs.web.id/image-generation/illustrious/xl-1.0',
    'imagen3': 'https://api.nekolabs.web.id/image-generation/imagen/3.0-fast',
    'imagen4': 'https://api.nekolabs.web.id/image-generation/imagen/4.0-fast',
    'juggernautxl': 'https://api.nekolabs.web.id/image-generation/juggernaut-xl',
    'majicmix': 'https://api.nekolabs.web.id/majicmix-realistic',
    'newreality': 'https://api.nekolabs.web.id/image-generation/newreality',
    'noobaixl': 'https://api.nekolabs.web.id/image-generation/noobai-xl',
    'noobai': 'https://api.nekolabs.web.id/image-generation/noobai',
    'pixarcartoon': 'https://api.nekolabs.web.id/image-generation/pixar-cartoon',
    'ponyrealism': 'https://api.nekolabs.web.id/image-generation/pony-realism',
    'seaartinfinity': 'https://api.nekolabs.web.id/image-generation/seaart/infinity',
    'seaartrealism': 'https://api.nekolabs.web.id/image-generation/seaart/realism',
    'stablediffusion': 'https://api.nekolabs.web.id/image-generation/stable-diffusion/3.5',
    'writecream': 'https://api.nekolabs.web.id/image-generation/writecream',
    'yayoimix': 'https://api.nekolabs.web.id/image-generation/yayoimix'
  };
  
  const apiUrl = apiMap[model];
  if (!apiUrl) {
    throw new Error(`Model tidak tersedia. Gunakan /api/image-models untuk melihat daftar model.`);
  }
  
  // Validasi ratio
  const validRatios = ['1:1', '16:9', '9:16'];
  if (!validRatios.includes(ratio)) {
    ratio = '1:1';
  }
  
  const response = await axios.get(apiUrl, {
    params: {
      prompt: prompt,
      ratio: ratio
    },
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const data = response.data;
  
  if (!data.success) {
    throw new Error(`Gagal menghasilkan gambar: ${data.message || 'Unknown error'}`);
  }
  
  if (!data.result) {
    throw new Error('Tidak ada gambar yang dihasilkan');
  }
  
  // Upload ke catbox
  const catboxUrl = await uploadToCatbox(data.result);
  
  return catboxUrl;
}

// Fungsi upload ke catbox
async function uploadToCatbox(imageUrl) {
  try {
    const response = await axios.post('https://catbox.moe/user/api.php', 
      `reqtype=urlupload&url=${encodeURIComponent(imageUrl)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // Jika gagal, throw error
    throw new Error('Gagal mengupload gambar ke hosting');
  }
}

// Endpoint untuk Remove Background HD
app.get('/api/remove-bg', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan'
      });
    }
    
    const result = await removeBackgroundHD(imageUrl);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: result
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi Remove Background HD
async function removeBackgroundHD(imageUrl) {
  try {
    // Download gambar dari URL
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });
    
    const buffer = Buffer.from(response.data);
    
    // Upload ke ugu.se terlebih dahulu
    const form = new FormData();
    form.append('files[]', buffer, {
      filename: `image_${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });
    
    const uploadResponse = await axios.post(
      "https://uguu.se/upload.php", 
      form,
      {
        headers: {
          ...form.getHeaders(),
        }
      }
    );
    
    if (!uploadResponse.data.files?.[0]?.url) {
      throw new Error('Gagal upload gambar ke ugu.se');
    }
    
    const uploadedUrl = uploadResponse.data.files[0].url;
    
    // Proses remove background HD
    const { data } = await axios.get(
      `https://api.offmonprst.my.id/api/removebghd?url=${uploadedUrl}`, 
      { 
        responseType: 'arraybuffer' 
      }
    );
    
    // Upload hasil ke telegra.ph
    const resultUrl = await uploadToTelegraph(data);
    
    return resultUrl;
    
  } catch (error) {
    throw new Error(`Gagal menghapus background HD: ${error.message}`);
  }
}

// Fungsi upload ke telegra.ph
async function uploadToTelegraph(buffer) {
  try {
    const form = new FormData();
    form.append('file', Buffer.from(buffer), {
      filename: `result_${Date.now()}.png`,
      contentType: 'image/png'
    });
    
    const response = await axios.post(
      "https://telegra.ph/upload", 
      form,
      {
        headers: {
          ...form.getHeaders()
        }
      }
    );
    
    if (response.data && response.data[0] && response.data[0].src) {
      return `https://telegra.ph${response.data[0].src}`;
    }
    throw new Error('Upload ke telegra.ph gagal');
  } catch (error) {
    throw new Error(`Gagal upload: ${error.message}`);
  }
}

// Endpoint untuk Claude AI
app.get('/api/claude', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "message" tidak ditemukan',
        example: '/api/claude?message=Siapa penemu gravitasi?'
      });
    }
    
    const response = await claudeAI(message);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: response
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi Claude AI
function getDataAttr(html, attr) {
  const re = new RegExp(`data-${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

async function claudeAI(text) {
  const baseHeaders = {
    Accept: '*/*',
    Referer: 'https://claudeai.one/',
    Origin: 'https://claudeai.one',
  };

  try {
    const { data: html } = await axios.get('https://claudeai.one/', {
      headers: baseHeaders,
    });
    
    const nonce   = getDataAttr(html, 'nonce');
    const postId  = getDataAttr(html, 'post-id');
    const botId   = getDataAttr(html, 'bot-id');
    
    const clientIdMatch = html.match(
      /localStorage\.setItem\(['"]wpaicg_chat_client_id['"],\s*['"]([^'"]+)['"]\)/
    );
    
    const clientId =
      clientIdMatch?.[1] ??
      'JHFiony-' + Math.random().toString(36).substring(2, 12);

    const form = new FormData();
    form.append('_wpnonce', nonce);
    form.append('post_id', postId);
    form.append('url', 'https://claudeai.one');
    form.append('action', 'wpaicg_chat_shortcode_message');
    form.append('message', text);
    form.append('bot_id', botId);
    form.append('chatbot_identity', 'shortcode');
    form.append('wpaicg_chat_history', '[]');
    form.append('wpaicg_chat_client_id', clientId);
    
    const { data: resp } = await axios.post(
      'https://claudeai.one/wp-admin/admin-ajax.php',
      form,
      {
        headers: {
          ...baseHeaders,
          ...form.getHeaders(),
        },
      }
    );
    
    const answer = resp?.data;
    if (!answer) {
      throw new Error('Claude AI tidak memberikan respons');
    }

    return answer;
    
  } catch (err) {
    throw new Error(`Gagal menghubungi Claude AI: ${err.message}`);
  }
}

app.get('/api/perplexity', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "message" tidak ditemukan'
      });
    }
    
    const response = await perplexityAI(message);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: response.answer,
        related_queries: response.relatedQueries,
        sources: response.source
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi untuk generate UUID
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fungsi Perplexity AI
const ANDROID_ID = '0a0000000002f59a';

async function perplexityAI(query) {
  const data = JSON.stringify({
    query_str: query,
    params: {
      source: 'android',
      version: '2.17',
      frontend_uuid: uuidv4(),
      android_device_id: ANDROID_ID,
      mode: 'concise',
      is_related_query: false,
      is_voice_to_voice: false,
      timezone: 'Asia/Shanghai',
      language: 'in',
      query_source: 'home',
      is_incognito: false,
      use_schematized_api: true,
      send_back_text_in_streaming_api: false,
      supported_block_use_cases: [
        'answer_modes', 'finance_widgets', 'knowledge_cards',
        'media_items', 'place_widgets', 'shopping_widgets',
        'sports_widgets', 'inline_entity_cards', 'inline_images',
        'inline_assets', 'search_result_widgets'
      ],
      sources: ['web'],
      model_preference: 'turbo'
    }
  });

  const config = {
    method: 'POST',
    url: 'https://www.perplexity.ai/rest/sse/perplexity_ask',
    headers: {
      'User-Agent': 'Ask/2.51.0/260466 (Android; Version 12; SAMSUNG N900A/SD1A.210817.037.A1 release-keys) SDK 31',
      'Accept': 'text/event-stream',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
      'x-app-version': '2.51.0',
      'x-client-version': '2.51.0',
      'x-client-name': 'Perplexity-Android',
      'x-client-env': 'prod',
      'x-app-apiclient': 'android',
      'x-app-apiversion': '2.17',
      'accept-language': 'id',
      'x-device-id': `android:${ANDROID_ID}`,
      'content-type': 'application/json; charset=utf-8'
    },
    data,
    responseType: 'stream'
  };

  const response = await axios.request(config);
  const result = await handleSSE(response);
  return result;
}

function handleSSE(response) {
  return new Promise((resolve, reject) => {
    let finalData = null;
    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonData = line.substring(6).trim();
            if (jsonData === '{}') continue;
            const data = JSON.parse(jsonData);
            if (data.final === true || data.status === 'COMPLETED') {
              finalData = data;
            }
          } catch (e) {
            continue;
          }
        }
      }
    });

    response.data.on('end', () => {
      let fullAnswer = '';
      let chunks = [];
      let parsedSteps = [];
      let webResults = [];

      if (finalData && finalData.blocks) {
        const markdownBlock = finalData.blocks.find(
          block => block.intended_usage === 'ask_text' && block.markdown_block
        );

        if (markdownBlock && markdownBlock.markdown_block) {
          if (markdownBlock.markdown_block.answer) {
            fullAnswer = markdownBlock.markdown_block.answer;
          } else if (markdownBlock.markdown_block.chunks) {
            chunks = markdownBlock.markdown_block.chunks;
            fullAnswer = chunks.join('');
          }
        }
      }

      try {
        parsedSteps = JSON.parse(finalData.text);
        const step = parsedSteps.find(step => step.step_type === 'SEARCH_RESULTS');
        if (step?.content?.web_results) {
          webResults = step.content.web_results;
        }
      } catch (e) {}

      resolve({
        answer: fullAnswer || 'Tidak ada jawaban dari AI',
        chunks,
        relatedQueries: finalData?.related_queries || [],
        source: webResults
      });
    });

    response.data.on('error', reject);
  });
}

app.get('/api/gpt-oss', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "message" tidak ditemukan'
      });
    }
    
    const response = await gptOss(message);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: response 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

const randomUserId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

async function gptOss(text) {
  try {
    const { data: rawSSE } = await axios.post(
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
          'content-type': 'application/json',
          origin: 'https://gpt-oss.com',
          cookie: `user_id=${randomUserId()}`,
          referer: 'https://gpt-oss.com/',
          'user-agent': 'Mozilla/5.0',
          'x-selected-model': 'gpt-oss-120b'
        },
        responseType: 'text',
        timeout: 30000
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
    
    return response || "Maaf, tidak dapat memproses permintaan Anda.";
    
  } catch (error) {
    throw new Error(error.message);
  }
}

app.get('/api/gpt-empat', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ 
        error: 'Parameter "message" tidak ditemukan',
        example: '/api/gpt41?message=halo, siapa kamu?'
      });
    }
    
    const response = await sendRequest(message);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi GPT-4.1
async function sendRequest(msg) {
  const url = 'https://text.pollinations.ai/openai';
  const data = {
    "messages": [
      {
        "role": "user",
        "content": msg
      }
    ],
    "stream": false
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'user-agent': 'Mozilla/5.0 (Linux; Android 14; NX769J Build/UKQ1.230917.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36'
  };

  try {
    const response = await fetch(url, {
      headers,
      body: JSON.stringify(data),  // Perbaiki: body bukan data
      method: "POST"
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const hasil = await response.json();
    
    if (!hasil.choices || !hasil.choices[0] || !hasil.choices[0].message) {
      throw new Error('Invalid response format from API');
    }
    
    return hasil.choices[0].message.content;
  } catch (error) {
    throw new Error(`GPT-4.1 Error: ${error.message}`);
  }
}

app.get('/api/cek-kuota-axis', async (req, res) => {
  try {
    const nomorhp = req.query.nomor;
    if (!nomorhp) {
      return res.status(400).json({ 
        error: 'Parameter "nomor" tidak ditemukan',
        example: '/api/cek-kuota-axis?nomor=6281234567890'
      });
    }
    
    const response = await cekkoutaaxisxl(nomorhp);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: response
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fungsi cek kuota Axis
async function cekkoutaaxisxl(nomorhp) {
  try {
    const { data } = await axios.get(`https://bendith.my.id/end.php`, {
      params: {
        check: "package",
        number: nomorhp,
        version: "2 201"
      }
    });
    return data;
  } catch (e) {
    throw new Error(`Gagal mengecek kuota: ${e.message}`);
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

// Endpoint untuk GitHub Gist
app.get('/api/gist', async (req, res) => {
  try {
    const gistUrl = req.query.url;
    if (!gistUrl) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan',
        example: '/api/gist?url=https://gist.github.com/username/abc123'
      });
    }
    
    const files = await getGistFiles(gistUrl);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: files
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Endpoint untuk get gist content langsung
app.get('/api/gist/content', async (req, res) => {
  try {
    const gistUrl = req.query.url;
    if (!gistUrl) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan'
      });
    }
    
    const files = await getGistFiles(gistUrl);
    
    // Format response dengan konten
    const result = files.map(file => ({
      fileName: file.fileName,
      language: file.language,
      fileSize: file.fileSize,
      formattedSize: formatUkuranMedia(file.fileSize),
      content: file.content,
      rawUrl: file.url,
      type: file.filesType
    }));
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        files: result,
        total_files: result.length
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi Get Gist Files
async function getGistFiles(input) {
  const match = input.match(/([0-9a-f]{20,40})/i);
  if (!match) throw new Error('ID Gist tidak valid!');
  
  const gistId = match[1];
  const apiUrl = `https://api.github.com/gists/${gistId}`;
  
  try {
    const res = await axios.get(apiUrl, {
      headers: { 
        'User-Agent': 'Gist-API-Client',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const files = res.data.files;
    const result = [];

    for (const fname of Object.keys(files)) {
      const rawUrl = files[fname].raw_url;
      const type = files[fname].type;
      const bahasa = files[fname].language;
      const isi = files[fname].content;
      const size = files[fname].size;
      
      result.push({
        fileName: fname,
        url: rawUrl,
        filesType: type,
        language: bahasa,
        fileSize: size,
        content: isi,
        gistId: gistId,
        owner: res.data.owner?.login || 'unknown'
      });
    }
    
    return result;
    
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Gist tidak ditemukan');
    } else if (error.response?.status === 403) {
      throw new Error('Rate limit exceeded. Coba lagi nanti.');
    }
    throw new Error(`Gagal mengambil gist: ${error.message}`);
  }
}

// Fungsi format ukuran file
function formatUkuranMedia(angka) {
  if (angka >= 1024 * 1024 * 1024) {
    return (angka / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  } else if (angka >= 1024 * 1024) {
    return (angka / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (angka >= 1024) {
    return (angka / 1024).toFixed(2) + ' KB';
  } else {
    return angka + ' B';
  }
}

// Endpoint untuk search gist by user
app.get('/api/gist/user', async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "username" tidak ditemukan'
      });
    }
    
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 10;
    
    const response = await axios.get(
      `https://api.github.com/users/${username}/gists`,
      {
        headers: { 
          'User-Agent': 'Gist-API-Client',
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          page: page,
          per_page: perPage
        }
      }
    );
    
    const gists = response.data.map(gist => ({
      id: gist.id,
      url: gist.html_url,
      description: gist.description,
      files: Object.keys(gist.files),
      created_at: gist.created_at,
      updated_at: gist.updated_at,
      owner: gist.owner?.login
    }));
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: {
        username: username,
        page: parseInt(page),
        per_page: parseInt(perPage),
        gists: gists,
        total: gists.length
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});


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

// Fungsi TikTok Downloader
async function ttdl(url) {
  try {
    const options = {
      method: 'GET',
      url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    };
    
    const response = await axios(options);
    return response.data;
  } catch (e) {
    try {
      const response = await axios.get(`https://tikwm.com/api?url=${encodeURIComponent(url)}`);
      return response.data;
    } catch (err) {
      throw new Error(`Gagal mendownload video TikTok: ${err.message}`);
    }
  }
}

// Endpoint TikTok Downloader
app.get('/api/tiktok', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        error: 'Parameter "url" tidak ditemukan',
        example: '/api/ttdl?url=https://vt.tiktok.com/ABC123/'
      });
    }
    
    const response = await ttdl(url);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: response  // HAPUS kurung kurawal { response }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Endpoint untuk LK21
app.get('/api/lk21/search', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "query" tidak ditemukan',
        example: '/api/lk21/search?query=Avengers'
      });
    }
    
    const lk21 = new LK21();
    const response = await lk21.search(query);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.get('/api/lk21/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan',
        example: '/api/lk21/detail?url=https://tv5.lk21official.cc/avengers-endgame-2019'
      });
    }
    
    const lk21 = new LK21();
    const response = await lk21.detail(url);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.get('/api/lk21/popular', async (req, res) => {
  try {
    const page = req.query.page || 1;
    
    const lk21 = new LK21();
    const response = await lk21.populer(page);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        page: parseInt(page),
        response 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Class LK21
class LK21 {
  constructor() {
    this.baseURL = 'https://tv5.lk21official.cc';
  }

  async getHTML(path) {
    try {
      const res = await axios.get(this.baseURL + path);
      return res.data;
    } catch (e) {
      throw e;
    }
  }

  async search(query) {
    try {
      const html = await this.getHTML('/search.php?s=' + query);
      const $ = cheerio.load(html);
      const result = [];

      $('.search-item').each((i, el) => {
        result.push({
          title: $(el).find('a[rel="bookmark"]').attr('title').trim(),
          link: this.baseURL + $(el).find('a[rel="bookmark"]').attr('href'),
          thumb: $(el).find('img').eq(1).attr('src'),
          genre: $(el).find('p').eq(0).text().split(':')[1].trim(),
          country: $(el).find('p').eq(1).text().split(':')[1].trim(),
          rating: $(el).find('p').eq(2).text().split(':')[1].trim()
        })
      });

      return result;

    } catch (e) {
      throw e
    }
  }

  async detail(url) {
    try {
      const html = await this.getHTML(url.replace(this.baseURL, ''));
      const $ = cheerio.load(html);

      const result = {
        title: $('.img-thumbnail').attr('alt').trim(),
        thumb: 'https:' + $('.img-thumbnail').attr('src'),
        quality: $('.content div:nth-child(1) h3').text(),
        country: $('.content div:nth-child(2) h3').text(),
        main_char: [],
        director: $('.content div:nth-child(4) h3').text(),
        genre: [],
        publishedDate: $('.content div:nth-child(7) h3').text(),
        synopsis: $('blockquote').text().split('Synopsis')[1].trim(),
        duration: $('.content div:nth-child(11) h3').text(),
        player: []
      }

      $('.content div:nth-child(3) h3').each((i, yaw) => result.main_char.push($(yaw).text()))
      $('.content div:nth-child(5) h3').each((i, yaw) => result.genre.push($(yaw).text()))

      $('#loadProviders li').each((i, yaw) => {
        let res = {
          name: $(yaw).find('a').text(),
          link: decodeURIComponent($(yaw).find('a').attr('href').split('url=')[1]),
          quality: []
        }

        $(yaw).find('span').each((my, apala) => {
          res.quality.push($(apala).text().trim());
        });

        result.player.push(res);

      })

      return result

    } catch (e) {
      throw e
    }
  }
  
  async populer(page = 1) {
    try {
      const html = await this.getHTML('/populer/page/' + page)
      const $ = cheerio.load(html)
      const result = []

      $('.infscroll-item').each((i, el) => {
        let anunya = {
          title: $(el).find('.grid-title a').text().trim(),
          link: $(el).find('.grid-title a').attr('href'),
          thumb: 'https:' + $(el).find('img').attr('src'),
          genre: [],
          rating: $(el).find('.grid-meta .rating').text() || 'unknown',
          quality: $(el).find('.quality').text(),
          duration: $(el).find('.duration').text()
        }

        $(el).find('.grid-categories a').each((ii, yaw) => {
          if ($(yaw).attr('href').includes('/genre/')) {
            anunya.genre.push($(yaw).text())
          }
        })

        result.push(anunya);

      })

      return result;

    } catch (e) {
      throw e;
    }
  }
}

app.get('/api/remove-clothes', async (req, res) => {
  try {
    const imageUrl = req.query.imageUrl;
    if (!imageUrl) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "imageUrl" tidak ditemukan'
      });
    }
    
    const response = await removeClothes(imageUrl);
    
    // Upload ke catbox
    const catboxUrl = await uploadToCatbox(response.result);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: catboxUrl
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

async function removeClothes(imageUrl) {
  try {
    const encodedUrl = encodeURIComponent(imageUrl);
    const apiUrl = `https://api.nekolabs.web.id/style-changer/remove-clothes?imageUrl=${encodedUrl}`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      timeout: 60000
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`Gagal memproses gambar: ${error.message}`);
  }
}

async function uploadToCatbox(imageUrl) {
  try {
    // Upload langsung dari URL ke catbox
    const response = await axios.post('https://catbox.moe/user/api.php', 
      `reqtype=urlupload&url=${encodeURIComponent(imageUrl)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // Jika gagal, return URL asli
    console.error('Gagal upload ke catbox:', error.message);
    return imageUrl;
  }
}

// Endpoint untuk YouTube Music Download
app.get('/api/yt-play', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "query" tidak ditemukan',
        example: '/api/yt-play?query=lovesick&girls&blackpink'
      });
    }
    
    const format = req.query.format || '128k';
    const response = await youtubePlay(query, format);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { response }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi YouTube Downloader
const yt = {
    url: Object.freeze({
        audio128: 'https://api.apiapi.lat',
        video: 'https://api5.apiapi.lat',
        else: 'https://api3.apiapi.lat',
        referrer: 'https://ogmp3.pro/'
    }),

    encUrl: s => s.split('').map(c => c.charCodeAt()).reverse().join(';'),
    xor: s => s.split('').map(v => String.fromCharCode(v.charCodeAt() ^ 1)).join(''),
    genRandomHex: () => Array.from({ length: 32 }, _ => "0123456789abcdef"[Math.floor(Math.random()*16)]).join(""),

    init: async function (rpObj) {
        const { apiOrigin, payload } = rpObj
        const api = apiOrigin + "/" + this.genRandomHex() + "/init/" + this.encUrl(this.xor(payload.data)) + "/" + this.genRandomHex() + "/"
        const r = await fetch(api, { method: "post", body: JSON.stringify(payload) })
        if (!r.ok) throw Error(await r.text())
        return r.json()
    },

    genFileUrl: function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        const pkValue = pk ? pk + "/" : ""
        const downloadUrl = apiOrigin + "/" + this.genRandomHex() + "/download/" + i + "/" + this.genRandomHex() + "/" + pkValue
        return { downloadUrl }
    },

    statusCheck: async function (i, pk, rpObj) {
        const { apiOrigin } = rpObj
        let json
        let count = 0
        do {
            await new Promise(r => setTimeout(r, 5000))
            count++
            const pkVal = pk ? pk + "/" : ""
            const api = apiOrigin + "/" + this.genRandomHex() + "/status/" + i + "/" + this.genRandomHex() + "/" + pkVal
            const r = await fetch(api, {
                method: "post",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: i })
            })
            if (!r.ok) throw Error(await r.text())
            json = await r.json()
            if (count >= 100) throw Error("pooling mencapai 100, dihentikan")
        } while (json.s === "P")
        if (json.s === "E") throw Error(JSON.stringify(json))
        return this.genFileUrl(i, pk, rpObj)
    },

    resolvePayload: function (ytUrl, userFormat) {
        const valid = ["64k","96k","128k","192k","256k","320k","240p","360p","480p","720p","1080p"]
        if (!valid.includes(userFormat)) throw Error(`format salah. tersedia: ${valid.join(", ")}`)

        let apiOrigin = this.url.audio128
        let data = this.xor(ytUrl)
        let referer = this.url.referrer
        let format = "0"
        let mp3Quality = "128"
        let mp4Quality = "720"

        if (/^\d+p$/.test(userFormat)) {
            apiOrigin = this.url.video
            format = "1"
            mp4Quality = userFormat.replace("p","")
        } else if (userFormat !== "128k") {
            apiOrigin = this.url.else
            mp3Quality = userFormat.replace("k","")
        }

        return {
            apiOrigin,
            payload: {
                data,
                format,
                referer,
                mp3Quality,
                mp4Quality,
                userTimeZone: "-480"
            }
        }
    },

    download: async function (url, fmt = "128k") {
        const rpObj = this.resolvePayload(url, fmt)
        const initObj = await this.init(rpObj)
        const { i, pk, s } = initObj
        if (s === "C") return this.genFileUrl(i, pk, rpObj)
        return this.statusCheck(i, pk, rpObj)
    }
};

// Fungsi utama YouTube Play
async function youtubePlay(query, format = '128k') {
  try {
    // Search video
    const yts = require('yt-search');
    const searchResult = await yts(query);
    const video = searchResult.videos[0];
    
    if (!video) {
      throw new Error('Video tidak ditemukan');
    }
    
    // Download audio
    const downloadResult = await yt.download(video.url, format);
    
    return {
      video_info: {
        title: video.title,
        author: video.author.name,
        views: video.views,
        duration: video.timestamp,
        uploaded: video.ago,
        thumbnail: video.thumbnail,
        url: video.url
      },
      download: {
        url: downloadResult.downloadUrl,
        format: format,
        filename: `${video.title}.${format.includes('k') ? 'mp3' : 'mp4'}`
      }
    };
    
  } catch (error) {
    throw new Error(`Gagal memproses: ${error.message}`);
  }
}

// Endpoint untuk search YouTube saja
app.get('/api/yt-search', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "query" tidak ditemukan'
      });
    }
    
    const limit = req.query.limit || 10;
    const yts = require('yt-search');
    const searchResult = await yts(query);
    
    const videos = searchResult.videos.slice(0, limit).map(video => ({
      title: video.title,
      author: video.author.name,
      views: video.views,
      duration: video.timestamp,
      uploaded: video.ago,
      thumbnail: video.thumbnail,
      url: video.url
    }));
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        query: query,
        total_results: searchResult.videos.length,
        results: videos 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Endpoint untuk download langsung dari URL YouTube
app.get('/api/yt-download', async (req, res) => {
  try {
    const url = req.query.url;
    const format = req.query.format || '128k';
    
    if (!url) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan'
      });
    }
    
    const downloadResult = await yt.download(url, format);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        download_url: downloadResult.downloadUrl,
        format: format,
        original_url: url
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Endpoint untuk WebPilot AI
app.get('/api/webpilot', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "query" tidak ditemukan'
      });
    }
    
    const response = await webpilotAI(query);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: response
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi WebPilot AI
async function webpilotAI(query) {
  try {
    const response = await axios.post(
      'https://api.webpilotai.com/rupee/v1/search',
      {
        q: query,
        threadId: ''
      },
      {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Accept': 'application/json,text/plain,*/*,text/event-stream',
          'Content-Type': 'application/json',
          'authorization': 'Bearer null',
          'origin': 'https://www.webpilot.ai'
        }
      }
    );
    
    let text = '';
    let sources = [];
    
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('data:')) {
            try {
              const data = JSON.parse(lines[i].slice(5).trim());
              if (data.type === 'data' && data.data && data.data.content && !data.data.section_id) {
                text = text + data.data.content;
              }
              if (data.action === 'using_internet' && data.data) {
                sources.push(data.data);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      });
      
      response.data.on('end', () => {
        resolve({
          text: text.trim(),
          sources: sources
        });
      });
      
      response.data.on('error', reject);
    });
    
  } catch (error) {
    throw new Error(`Gagal menghubungi WebPilot AI: ${error.message}`);
  }
}

// Endpoint untuk Gemini AI
app.get('/api/gemini', async (req, res) => {
  try {
    const message = req.query.message;
    const chatId = req.query.chat_id;
    
    if (!message) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "message" tidak ditemukan'
      });
    }
    
    const response = await geminiAI(message, chatId);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: response
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Fungsi Gemini AI
const gemini = {
    getNewCookie: async function () {
        try {
            const response = await axios.post(
                "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c",
                "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
                {
                    headers: {
                        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                    }
                }
            );
            
            const cookies = response.headers['set-cookie'];
            if (cookies && cookies[0]) {
                return cookies[0].split("; ")[0];
            }
            throw new Error('Cookie not found');
        } catch (error) {
            throw new Error(`Gagal mendapatkan cookie: ${error.message}`);
        }
    },

    ask: async function (prompt, previousId = null) {
        try {
            if (typeof (prompt) !== "string" || !prompt?.trim()?.length) {
                throw new Error('Prompt tidak boleh kosong');
            }
            
            let resumeArray = null;
            let cookie = null;
            
            if (previousId) {
                try {
                    const s = Buffer.from(previousId, 'base64').toString('utf8');
                    const j = JSON.parse(s);
                    resumeArray = j.newResumeArray;
                    cookie = j.cookie;
                } catch (e) {
                    console.error('Error parsing previousId:', e.message);
                }
            }
            
            const headers = {
                "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                "x-goog-ext-525001261-jspb": "[1,null,null,null,\"9ec249fc9ad08861\",null,null,null,[4]]",
                "cookie": cookie || await this.getNewCookie(),
                "User-Agent": "Mozilla/5.0"
            };
            
            const b = [[prompt], ["en-US"], resumeArray];
            const a = [null, JSON.stringify(b)];
            const obj = { "f.req": JSON.stringify(a) };
            const body = new URLSearchParams(obj).toString();
            
            const response = await axios.post(
                `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=en-US&_reqid=2813378&rt=c`,
                body,
                { headers: headers }
            );
            
            if (!response.data) {
                throw new Error('Response data kosong');
            }
            
            const data = response.data;
            const lines = data.split('\n');
            
            // Cari JSON yang valid
            let selectedArray = null;
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('[') && line.endsWith(']')) {
                    try {
                        JSON.parse(line);
                        selectedArray = line;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            if (!selectedArray) {
                throw new Error('Tidak dapat parse response');
            }
            
            const realArray = JSON.parse(selectedArray);
            const parse1 = JSON.parse(realArray[0][2]);
            
            if (!parse1 || !parse1[4] || !parse1[4][0] || !parse1[4][0][1]) {
                throw new Error('Format response tidak sesuai');
            }
            
            const newResumeArray = [...parse1[1], parse1[4][0][0]];
            const text = parse1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, `*$1*`);
            const id = Buffer.from(JSON.stringify({ newResumeArray, cookie: headers.cookie })).toString('base64');
            
            return { text, id };
            
        } catch (error) {
            throw new Error(`Gagal memproses: ${error.message}`);
        }
    }
};

// Fungsi utama Gemini AI
async function geminiAI(message, chatId = null) {
    try {
        const result = await gemini.ask(message, chatId);
        return result;
    } catch (error) {
        throw new Error(`Gemini AI error: ${error.message}`);
    }
}

// Endpoint untuk membuat chat baru
app.get('/api/gemini/start', async (req, res) => {
  try {
    const message = req.query.message || 'Halo';
    const result = await geminiAI(message, null);
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        response: result.text,
        chat_id: result.id,
        message: "Chat berhasil dimulai. Gunakan chat_id untuk melanjutkan percakapan."
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// ==================== FEEDBACK SYSTEM ====================

// Feedback endpoints
app.get('/api/feedback/ratings', async (req, res) => {
  try {
    const db = await readDatabase();
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        ratings: db.ratings 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.post('/api/feedback/ratings', async (req, res) => {
  try {
    const { name, rating, message } = req.body;
    
    if (!name || !rating || !message) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Nama, rating, dan pesan harus diisi' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Rating harus antara 1-5' 
      });
    }
    
    const db = await readDatabase();
    const newRating = {
      id: Date.now(),
      name,
      rating,
      message,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('id-ID')
    };
    
    db.ratings.unshift(newRating);
    await writeDatabase(db);
    
    res.status(201).json({
      status: 201,
      creator: "Geraldo",
      data: { 
        message: 'Rating berhasil ditambahkan',
        rating: newRating
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.get('/api/feedback/criticisms', async (req, res) => {
  try {
    const db = await readDatabase();
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        criticisms: db.criticisms 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.post('/api/feedback/criticisms', async (req, res) => {
  try {
    const { name, criticism } = req.body;
    
    if (!name || !criticism) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Nama dan kritik harus diisi' 
      });
    }
    
    const db = await readDatabase();
    const newCriticism = {
      id: Date.now(),
      name,
      criticism,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('id-ID')
    };
    
    db.criticisms.unshift(newCriticism);
    await writeDatabase(db);
    
    res.status(201).json({
      status: 201,
      creator: "Geraldo",
      data: { 
        message: 'Kritik berhasil ditambahkan',
        criticism: newCriticism
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.get('/api/feedback/suggestions', async (req, res) => {
  try {
    const db = await readDatabase();
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        suggestions: db.suggestions 
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

app.post('/api/feedback/suggestions', async (req, res) => {
  try {
    const { name, suggestion } = req.body;
    
    if (!name || !suggestion) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Nama dan saran harus diisi' 
      });
    }
    
    const db = await readDatabase();
    const newSuggestion = {
      id: Date.now(),
      name,
      suggestion,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('id-ID')
    };
    
    db.suggestions.unshift(newSuggestion);
    await writeDatabase(db);
    
    res.status(201).json({
      status: 201,
      creator: "Geraldo",
      data: { 
        message: 'Saran berhasil ditambahkan',
        suggestion: newSuggestion
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Statistics endpoint
app.get('/api/feedback/stats', async (req, res) => {
  try {
    const db = await readDatabase();
    
    const totalRatings = db.ratings.length;
    const totalCriticisms = db.criticisms.length;
    const totalSuggestions = db.suggestions.length;
    const averageRating = totalRatings > 0 
      ? (db.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : 0;
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: {
        total_ratings: totalRatings,
        total_criticisms: totalCriticisms,
        total_suggestions: totalSuggestions,
        average_rating: parseFloat(averageRating),
        total_feedback: totalRatings + totalCriticisms + totalSuggestions,
        rating_distribution: {
          1: db.ratings.filter(r => r.rating === 1).length,
          2: db.ratings.filter(r => r.rating === 2).length,
          3: db.ratings.filter(r => r.rating === 3).length,
          4: db.ratings.filter(r => r.rating === 4).length,
          5: db.ratings.filter(r => r.rating === 5).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// All feedback endpoint
app.get('/api/feedback/all', async (req, res) => {
  try {
    const db = await readDatabase();
    
    const allFeedback = [
      ...db.ratings.map(item => ({ ...item, type: 'rating' })),
      ...db.criticisms.map(item => ({ ...item, type: 'criticism' })),
      ...db.suggestions.map(item => ({ ...item, type: 'suggestion' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        feedback: allFeedback,
        count: allFeedback.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 500,
      creator: "Geraldo",
      error: error.message 
    });
  }
});

// Helper functions untuk database
const fs = require('fs').promises;
const path = require('path');
const DB_FILE = path.join(__dirname, 'feedback-database.json');

async function readDatabase() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Jika file tidak ada, buat default
    return { ratings: [], criticisms: [], suggestions: [] };
  }
}

async function writeDatabase(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize database file jika belum ada
async function initializeDatabase() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await writeDatabase({ ratings: [], criticisms: [], suggestions: [] });
    console.log('Database feedback berhasil diinisialisasi');
  }
}

// Panggil init saat server start
initializeDatabase();

// Tambahkan ke menu (Kategori baru: Feedback)
app.get('/api/feedback/test', (req, res) => {
  res.json({
    status: 200,
    creator: "Geraldo",
    data: {
      endpoints: [
        { method: 'GET', path: '/api/feedback/ratings', desc: 'Get semua ratings' },
        { method: 'POST', path: '/api/feedback/ratings', desc: 'Tambah rating baru' },
        { method: 'GET', path: '/api/feedback/criticisms', desc: 'Get semua kritik' },
        { method: 'POST', path: '/api/feedback/criticisms', desc: 'Tambah kritik baru' },
        { method: 'GET', path: '/api/feedback/suggestions', desc: 'Get semua saran' },
        { method: 'POST', path: '/api/feedback/suggestions', desc: 'Tambah saran baru' },
        { method: 'GET', path: '/api/feedback/stats', desc: 'Get statistik feedback' },
        { method: 'GET', path: '/api/feedback/all', desc: 'Get semua feedback' }
      ],
      format: {
        rating: { name: 'string', rating: 'number (1-5)', message: 'string' },
        criticism: { name: 'string', criticism: 'string' },
        suggestion: { name: 'string', suggestion: 'string' }
      }
    }
  });
});

// HTML interface untuk feedback
app.get('/feedback', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Feedback System - Geraldo API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .section { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 10px; }
        input, textarea, select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        .stars { font-size: 30px; color: gold; cursor: pointer; }
        .feedback-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .type-rating { border-left: 5px solid #28a745; }
        .type-criticism { border-left: 5px solid #dc3545; }
        .type-suggestion { border-left: 5px solid #ffc107; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-box { background: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
    </style>
</head>
<body>
    <h1>📝 Feedback System - Geraldo API</h1>
    
    <div class="section">
        <h2>⭐ Beri Rating</h2>
        <div class="stars" id="stars">
            <span onclick="setRating(1)">☆</span>
            <span onclick="setRating(2)">☆</span>
            <span onclick="setRating(3)">☆</span>
            <span onclick="setRating(4)">☆</span>
            <span onclick="setRating(5)">☆</span>
        </div>
        <input type="text" id="ratingName" placeholder="Nama Anda">
        <textarea id="ratingMessage" placeholder="Pesan Anda..." rows="3"></textarea>
        <button onclick="submitRating()">Kirim Rating</button>
    </div>
    
    <div class="section">
        <h2>💬 Beri Kritik</h2>
        <input type="text" id="criticismName" placeholder="Nama Anda">
        <textarea id="criticismText" placeholder="Kritik Anda..." rows="3"></textarea>
        <button onclick="submitCriticism()">Kirim Kritik</button>
    </div>
    
    <div class="section">
        <h2>💡 Beri Saran</h2>
        <input type="text" id="suggestionName" placeholder="Nama Anda">
        <textarea id="suggestionText" placeholder="Saran Anda..." rows="3"></textarea>
        <button onclick="submitSuggestion()">Kirim Saran</button>
    </div>
    
    <div class="section">
        <h2>📊 Statistik</h2>
        <div class="stats" id="stats"></div>
        <button onclick="loadStats()">Refresh Statistik</button>
    </div>
    
    <div class="section">
        <h2>📋 Semua Feedback</h2>
        <div id="allFeedback"></div>
        <button onclick="loadAllFeedback()">Refresh Feedback</button>
    </div>
    
    <script>
        let currentRating = 0;
        
        function setRating(rating) {
            currentRating = rating;
            const stars = document.querySelectorAll('#stars span');
            stars.forEach((star, index) => {
                star.textContent = index < rating ? '★' : '☆';
            });
        }
        
        async function submitRating() {
            const name = document.getElementById('ratingName').value;
            const message = document.getElementById('ratingMessage').value;
            
            if (!name || !currentRating || !message) {
                alert('Harap isi semua field untuk rating');
                return;
            }
            
            const response = await fetch('/api/feedback/ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rating: currentRating, message })
            });
            
            const data = await response.json();
            alert(data.data.message);
            loadStats();
            loadAllFeedback();
        }
        
        async function submitCriticism() {
            const name = document.getElementById('criticismName').value;
            const criticism = document.getElementById('criticismText').value;
            
            if (!name || !criticism) {
                alert('Harap isi semua field untuk kritik');
                return;
            }
            
            const response = await fetch('/api/feedback/criticisms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, criticism })
            });
            
            const data = await response.json();
            alert(data.data.message);
            loadStats();
            loadAllFeedback();
        }
        
        async function submitSuggestion() {
            const name = document.getElementById('suggestionName').value;
            const suggestion = document.getElementById('suggestionText').value;
            
            if (!name || !suggestion) {
                alert('Harap isi semua field untuk saran');
                return;
            }
            
            const response = await fetch('/api/feedback/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, suggestion })
            });
            
            const data = await response.json();
            alert(data.data.message);
            loadStats();
            loadAllFeedback();
        }
        
        async function loadStats() {
            const response = await fetch('/api/feedback/stats');
            const data = await response.json();
            
            const stats = data.data;
            document.getElementById('stats').innerHTML = \`
                <div class="stat-box">
                    <h3>⭐ Rating Rata-rata</h3>
                    <h2>\${stats.average_rating}/5</h2>
                </div>
                <div class="stat-box">
                    <h3>📊 Total Feedback</h3>
                    <h2>\${stats.total_feedback}</h2>
                </div>
                <div class="stat-box">
                    <h3>💬 Kritik & Saran</h3>
                    <h2>\${stats.total_criticisms + stats.total_suggestions}</h2>
                </div>
            \`;
        }
        
        async function loadAllFeedback() {
            const response = await fetch('/api/feedback/all');
            const data = await response.json();
            
            const feedbackHTML = data.data.feedback.map(item => \`
                <div class="feedback-item type-\${item.type}">
                    <strong>\${item.name}</strong> 
                    <small>\${item.date}</small>
                    <div>\${item.type === 'rating' ? '⭐'.repeat(item.rating) : ''}</div>
                    <p>\${item.message || item.criticism || item.suggestion}</p>
                </div>
            \`).join('');
            
            document.getElementById('allFeedback').innerHTML = feedbackHTML || 'Belum ada feedback';
        }
        
        // Load data saat halaman dibuka
        loadStats();
        loadAllFeedback();
    </script>
</body>
</html>
  `);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Ada kesalahan pada server');
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
