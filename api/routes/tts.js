const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/convert', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'متن الزامی است' });
    }

    console.log('TTS Request for text:', text);

    const ttsUrl = 'https://api.ahmadreza-avandi.ir/text-to-speech';
    console.log('Sending request to TTS API:', ttsUrl);

    const response = await axios.post(ttsUrl, {
      text: text,
      speaker: "3",
      checksum: "1",
      filePath: "true",
      base64: "0"
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dastyar-Robin/1.0'
      }
    });

    console.log('TTS API Response status:', response.status);
    console.log('TTS API Response data:', JSON.stringify(response.data, null, 2));

    // بررسی ساختار پاسخ بر اساس لاگ‌ها
    if (response.data && response.data.data && response.data.data.status === 'success' && response.data.data.data) {
      const filePath = response.data.data.data.filePath;
      const directUrl = filePath.startsWith('http') ? filePath : `https://${filePath}`;

      console.log('Extracted filePath:', filePath);
      console.log('Direct URL:', directUrl);

      // Test if we can access the direct URL
      try {
        const testResponse = await axios.head(directUrl, { timeout: 5000 });
        console.log('Direct URL test successful:', testResponse.status);

        // If direct URL works, use proxy
        const proxyUrl = `${req.protocol}://${req.get('host')}/api/tts/stream?u=${encodeURIComponent(directUrl)}`;
        console.log('Generated audio URL (proxied):', proxyUrl);

        res.json({
          success: true,
          audioUrl: proxyUrl,
          directUrl: directUrl,
          checksum: response.data.data.data.checksum
        });
      } catch (testError) {
        console.log('Direct URL test failed, returning direct URL:', testError.message);

        // If proxy won't work, return direct URL and let client handle CORS
        res.json({
          success: true,
          audioUrl: directUrl, // Return direct URL instead of proxy
          directUrl: directUrl,
          checksum: response.data.data.data.checksum,
          note: 'Using direct URL due to proxy limitations'
        });
      }
    } else {
      console.error('TTS API returned unexpected structure:', response.data);
      throw new Error('خطا در تبدیل متن به صدا - ساختار پاسخ نامعتبر');
    }

  } catch (error) {
    console.error('خطا در TTS:', error.message);
    if (error.response) {
      console.error('TTS API Error Response:', error.response.status, error.response.data);
    }

    res.status(500).json({
      error: 'خطا در تبدیل متن به صدا',
      success: false
    });
  }
});

// Stream/proxy external audio URL through our server for same-origin playback
router.get('/stream', async (req, res) => {
  const targetUrl = req.query.u;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing target URL');
  }

  try {
    console.log('Streaming audio from:', targetUrl);

    // First try to get the file with a simple request
    const upstream = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
      maxRedirects: 10,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      },
      // Add proxy settings if needed
      proxy: false
    });

    console.log('Upstream response status:', upstream.status);
    console.log('Upstream content-type:', upstream.headers['content-type']);

    // Set CORS headers for audio playback
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    // Forward essential headers
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'audio/mpeg');
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
    }

    // Handle range requests for audio seeking
    if (req.headers.range && upstream.headers['accept-ranges']) {
      res.setHeader('Content-Range', upstream.headers['content-range'] || '');
      res.status(206);
    }

    upstream.data.pipe(res);

    upstream.data.on('end', () => {
      console.log('Audio stream completed successfully');
    });

  } catch (err) {
    console.error('Proxy stream error:', err?.message);
    if (err.response) {
      console.error('Upstream status:', err.response.status);
      console.error('Upstream data:', err.response.data);
    } else if (err.code === 'ENOTFOUND') {
      console.error('Domain not found:', targetUrl);
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused:', targetUrl);
    }

    if (!res.headersSent) {
      res.status(502).json({
        error: 'Failed to fetch audio',
        message: 'سرور صوتی در دسترس نیست',
        code: err.code,
        url: targetUrl
      });
    }
  }
});

// Handle OPTIONS requests for CORS
router.options('/stream', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.status(200).end();
});

// Debug route to test TTS API directly
router.get('/debug/:text', async (req, res) => {
  try {
    const text = decodeURIComponent(req.params.text);
    console.log('Debug TTS for:', text);

    const ttsUrl = 'https://api.ahmadreza-avandi.ir/text-to-speech';
    const response = await axios.post(ttsUrl, {
      text: text,
      speaker: "3",
      checksum: "1",
      filePath: "true",
      base64: "0"
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dastyar-Robin/1.0'
      }
    });

    res.json({
      success: true,
      apiResponse: response.data,
      status: response.status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      response: error.response?.data
    });
  }
});

// Test route to check if audio URL is accessible
router.get('/test-url', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    console.log('Testing URL accessibility:', url);
    const response = await axios.head(url, { timeout: 10000 });
    res.json({
      success: true,
      status: response.status,
      headers: response.headers,
      accessible: true
    });
  } catch (error) {
    console.error('URL test failed:', error.message);
    res.json({
      success: false,
      error: error.message,
      code: error.code,
      accessible: false
    });
  }
});

module.exports = router;