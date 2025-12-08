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

app.get('/api/zonerai', async (req, res) => {
  try {
    const prompt = req.query.prompt;
    if (!prompt) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "prompt" tidak ditemukan',
        example: '/api/zonerai?prompt=futuristic anime girl&resolution=square'
      });
    }
    
    const resolution = req.query.resolution || 'portrait';
    const upscale = req.query.upscale || 2;
    
    const images = await zonerAITextToImage(prompt, resolution, upscale);
    
    // Upload semua gambar ke catbox
    const uploadedImages = [];
    for (const buffer of images) {
      const imageUrl = await uploadToCatbox(buffer);
      uploadedImages.push(imageUrl);
    }
    
    res.status(200).json({
      status: 200,
      creator: "Geraldo",
      data: { 
        prompt: prompt,
        resolution: resolution,
        upscale: upscale,
        images: uploadedImages,
        count: uploadedImages.length,
        dimensions: getResolutionDimensions(resolution)
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

// Resolusi yang tersedia
const resolutions = {
  portrait: { width: 768, height: 1344 },
  landscape: { width: 1344, height: 768 },
  square: { width: 1024, height: 1024 },
  ultra: { width: 1536, height: 1536 },
  tall: { width: 832, height: 1344 },
  wide: { width: 1344, height: 832 },
};

// Fungsi Zoner AI Text to Image
async function zonerAITextToImage(prompt, resolution = 'portrait', upscale = 2) {
  const selected = resolutions[resolution] || resolutions.portrait;
  const { width, height } = selected;

  // Buat 3 gambar secara paralel
  const promises = Array.from({ length: 3 }, (_, idx) => {
    const form = new FormData();
    form.append('Prompt', prompt);
    form.append('Language', 'eng_Latn');
    form.append('Size', `${width}x${height}`);
    form.append('Upscale', upscale.toString());
    form.append('Batch_Index', idx.toString());

    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    return axios.post(
      'https://api.zonerai.com/zoner-ai/txt2img',
      form,
      {
        httpsAgent: agent,
        headers: {
          ...form.getHeaders(),
          'Origin': 'https://zonerai.com',
          'Referer': 'https://zonerai.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        responseType: 'arraybuffer'
      }
    ).then(res => {
      return Buffer.from(res.data);
    });
  });

  return Promise.all(promises);
}

// Fungsi upload buffer ke catbox
async function uploadToCatbox(buffer) {
  try {
    const base64Data = buffer.toString('base64');
    const response = await axios.post('https://catbox.moe/user/api.php', 
      `reqtype=base64&userhash=&file=${encodeURIComponent(base64Data)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // Jika gagal, return data URI
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}

// Fungsi untuk mendapatkan dimensi resolusi
function getResolutionDimensions(resolution) {
  const res = resolutions[resolution] || resolutions.portrait;
  return `${res.width}x${res.height}`;
}

// Endpoint untuk list resolusi yang tersedia
app.get('/api/zonerai/resolutions', (req, res) => {
  const availableResolutions = Object.keys(resolutions).map(key => ({
    name: key,
    dimensions: `${resolutions[key].width}x${resolutions[key].height}`,
    width: resolutions[key].width,
    height: resolutions[key].height
  }));
  
  res.json({
    status: 200,
    creator: "Geraldo",
    data: {
      resolutions: availableResolutions,
      default: 'portrait',
      example: '/api/zonerai?prompt=futuristic anime girl&resolution=square&upscale=2'
    }
  });
});

app.get('/api/remove-bg', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan',
        example: '/api/remove-bg?url=https://example.com/image.jpg'
      });
    }
    
    const result = await removeBackground(imageUrl);
    
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

async function removeBackground(imageUrl) {
  try {
    // Download gambar dari URL
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });
    
    const imgBuffer = Buffer.from(response.data);
    const imgPath = path.join(tmpdir(), `ori_${Date.now()}_${path.basename(imageUrl)}`);
    fs.writeFileSync(imgPath, imgBuffer);
    
    // Convert ke base64 data URI
    const b64img = imgBuffer.toString('base64');
    const mimtype = getImageType(imageUrl);
    const datauri = `data:${mimtype};base64,${b64img}`;
    
    // Kirim ke API
    const apiResponse = await axios({
      method: 'post',
      url: 'https://background-remover.com/removeImageBackground',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'origin': 'https://background-remover.com',
        'referer': 'https://background-remover.com/upload',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      },
      data: {
        encodedImage: datauri
      }
    });
    
    const hasil = apiResponse.data;
    if (hasil?.encodedImageWithoutBackground) {
      // Ekstrak base64 dari data URI
      const b64data = hasil.encodedImageWithoutBackground.replace(/^data:image\/\w+;base64,/, '');
      const resultBuffer = Buffer.from(b64data, 'base64');
      
      // Upload ke catbox
      const catboxUrl = await uploadToCatboxBase64(b64data);
      
      // Hapus file temporary
      fs.unlinkSync(imgPath);
      
      return catboxUrl;
    } else {
      throw new Error('Gagal menghapus background');
    }
  } catch (error) {
    throw new Error(error.message || 'Terjadi kesalahan saat menghapus background');
  }
}

// Fungsi untuk menentukan tipe gambar dari URL
function getImageType(imageUrl) {
  const url = imageUrl.toLowerCase();
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.gif')) return 'image/gif';
  if (url.includes('.webp')) return 'image/webp';
  return 'image/jpeg'; // default
}

// Fungsi upload base64 ke catbox
async function uploadToCatboxBase64(base64Data) {
  try {
    const response = await axios.post('https://catbox.moe/user/api.php', 
      `reqtype=base64&userhash=&file=${encodeURIComponent(base64Data)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // Jika gagal, convert base64 ke data URI
    return `data:image/png;base64,${base64Data}`;
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

// Endpoint untuk pencarian komik
app.get('/api/komik/search', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "query" tidak ditemukan'
      });
    }
    
    const response = await komikSearch(query);
    
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

// Endpoint untuk detail komik
app.get('/api/komik/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan'
      });
    }
    
    const response = await komikDetail(url);
    
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

// Endpoint untuk download komik - return direct image URLs
app.get('/api/komik/download', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        status: 400,
        creator: "Geraldo",
        error: 'Parameter "url" tidak ditemukan'
      });
    }
    
    const response = await komikDownload(url);
    
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

// Fungsi pencarian komik
async function komikSearch(query) {
  try {
    const response = await axios.get(
      `https://api.siputzx.my.id/api/anime/komikindo-search?query=${encodeURIComponent(query)}`
    );
    
    return response.data;
  } catch (error) {
    throw new Error(`Gagal mencari komik: ${error.message}`);
  }
}

// Fungsi detail komik
async function komikDetail(url) {
  try {
    const response = await axios.get(
      `https://api.siputzx.my.id/api/anime/komikindo-detail?url=${encodeURIComponent(url)}`
    );
    
    return response.data;
  } catch (error) {
    throw new Error(`Gagal mengambil detail komik: ${error.message}`);
  }
}

// Fungsi download komik - return direct image URLs
async function komikDownload(url) {
  try {
    const response = await axios.get(
      `https://api.siputzx.my.id/api/anime/komikindo-download?url=${encodeURIComponent(url)}`
    );
    
    return response.data;
  } catch (error) {
    throw new Error(`Gagal download komik: ${error.message}`);
  }
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Ada kesalahan pada server');
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
