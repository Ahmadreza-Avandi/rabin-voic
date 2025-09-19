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
    console.log('TTS API Response data:', response.data);

    if (response.data.success) {
      res.json({
        success: true,
        audioUrl: response.data.data.audioUrl,
        audioBase64: response.data.data.audioBase64
      });
    } else {
      console.error('TTS API returned success=false:', response.data);
      throw new Error('خطا در تبدیل متن به صدا');
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

module.exports = router;