const express = require('express');
const axios = require('axios');
const actions = require('../utils/actions');
const router = express.Router();

// پرامپت سیستم برای پاسخ مستقیم
const SYSTEM_PROMPT = `تو دستیار رابین هستی، یک هوش مصنوعی تعاملی و هوشمند شبیه به جارویس. همیشه به زبان فارسی پاسخ بده، مودب و کمک‌کننده باش. پاسخ‌ها رو کوتاه و شخصی نگه دار. هیستوری رو در نظر بگیر.
اگر قصد کاربر تشخیص داده شد، نتیجه اکشن رو ادغام کن (مثل "گزارش آماده است: [جزئیات]").`;

// پرامپت برای تشخیص قصد
const INTENT_PROMPT = `از متن زیر، قصد کاربر رو در حداکثر دو کلمه تشخیص بده و فقط یکی از دستورات لیست زیر رو انتخاب کن. اگر هیچی مطابقت نشد، بگو "نامشخص".
لیست دستورات: گزارش خودم, گزارش کار احمد, گزارش احمد, گزارش علی, گزارش سارا, گزارش محمد, فعالیت همکار احمد, گزارشات امروز, همه گزارشات, کل گزارشات امروز, تمام گزارشات امروز, تحلیل فروش یک هفته, فروش ماه گذشته, آمار فروش سه ماه, تحلیل بازخورد هفتگی, نظرات ماه گذشته, بازخورد سه ماه, تحلیل سودآوری هفتگی, سودآوری ماه گذشته, سود سه ماه, فایل گزارش برای احمد, سند پروژه برای علی, ارسال قرارداد برای سارا, فایل مالی برای محمد, ارسال سند برای مدیر, یادآوری وظایف, تحلیل رقبا, ارسال پیام به تیم, گزارش عملکرد ماهانه.
متن کاربر:`;

async function callOpenRouter(messages) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: process.env.OPENROUTER_MODEL,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('خطا در درخواست به OpenRouter:', error.message);
    throw new Error('خطا در برقراری ارتباط با هوش مصنوعی');
  }
}

// مسیر برای پردازش پیام کاربر
router.post('/process', async (req, res) => {
  try {
    const { userMessage, history = [] } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ error: 'پیام کاربر الزامی است' });
    }

    // ساخت پیام‌ها برای درخواست مستقیم
    const directMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.flatMap(h => [
        { role: 'user', content: h.user },
        { role: 'assistant', content: h.robin }
      ]),
      { role: 'user', content: userMessage }
    ];

    // ساخت پیام‌ها برای تشخیص قصد
    const intentMessages = [
      { role: 'system', content: `${INTENT_PROMPT} ${userMessage}` }
    ];

    // درخواست‌های موازی
    const [directResponse, intentResponse] = await Promise.all([
      callOpenRouter(directMessages),
      callOpenRouter(intentMessages)
    ]);

    console.log(`🎯 قصد تشخیص‌ داده شده: ${intentResponse}`);

    // بررسی و اجرای اکشن
    let actionResult = '';
    if (intentResponse && intentResponse !== 'نامشخص' && actions[intentResponse.trim()]) {
      console.log(`⚡ در حال اجرای اکشن: ${intentResponse.trim()}`);
      actionResult = actions[intentResponse.trim()]();
    }

    // ادغام پاسخ نهایی
    let finalResponse = directResponse;
    if (actionResult) {
      finalResponse = `${directResponse}\n${actionResult}`;
    }

    res.json({
      response: finalResponse,
      intent: intentResponse,
      actionExecuted: !!actionResult
    });

  } catch (error) {
    console.error('خطا در پردازش پیام:', error.message);
    res.status(500).json({ 
      error: 'متأسفم، مشکلی پیش آمد. لطفاً دوباره امتحان کنید.' 
    });
  }
});

module.exports = router;