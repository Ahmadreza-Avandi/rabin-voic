const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/convert', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'متن الزامی است' });
    }

    const response = await axios.post(process.env.TTS_API_URL, {
      text: text,
      speaker: "3",
      checksum: "1",
      filePath: "true",
      base64: "0"
    });

    if (response.data.success) {
      res.json({
        success: true,
        audioUrl: response.data.data.audioUrl,
        audioBase64: response.data.data.audioBase64
      });
    } else {
      throw new Error('خطا در تبدیل متن به صدا');
    }

  } catch (error) {
    console.error('خطا در TTS:', error.message);
    res.status(500).json({ 
      error: 'خطا در تبدیل متن به صدا',
      success: false 
    });
  }
});

module.exports = router;