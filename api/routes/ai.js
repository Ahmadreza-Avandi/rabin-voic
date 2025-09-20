const express = require('express');
const axios = require('axios');
const actions = require('../utils/actions');
const router = express.Router();

// پرامپت سیستم برای پاسخ مستقیم
const SYSTEM_PROMPT = `  تو دستیار هوشمند شرکت رابین هستی، با نام رابین، و به نرم‌افزار هوشمند رابین دسترسی داری. می‌تونی در بررسی فروش، مشتریان و همکاران کمک کنی و توسط احمدرضا آوندی توسعه داده شدی. همچنین قادر به انجام فعالیت‌های خاصی مثل پیگیری وظایف همکاران، پیگیری درخواست‌های مشتریان و مشاوره به همکاران و مشتریان هستی و همیشه آماده کمک هستی. همیشه به زبان فارسی پاسخ بده، مودب و کمک‌کننده باش. پاسخ‌ها رو کوتاه و شخصی نگه دار. هیستوری رو در نظر بگیر. اگر قصد کاربر تشخیص داده شد، نتیجه اکشن رو ادغام کن (مثل "گزارش آماده است: [جزئیات]"). فقط در پیام اول سلام کن، نه در همه پیام‌ها. خیلی خوب میشه اگر رسمی صحبت نکنی`;
// پرامپت برای تشخیص قصد
const INTENT_PROMPT = `از متن زیر، قصد کاربر رو دقیقاً تشخیص بده. اگر متن با هیچکدام از دستورات زیر مطابقت نداشت، حتماً "null" برگردان.
لیست دستورات: گزارش خودم, گزارش کار احمد, گزارش احمد, گزارش علی, گزارش سارا, گزارش محمد, فعالیت همکار احمد, گزارشات امروز, همه گزارشات, کل گزارشات امروز, تمام گزارشات امروز, تحلیل فروش یک هفته, فروش ماه گذشته, آمار فروش سه ماه, تحلیل بازخورد هفتگی, نظرات ماه گذشته, بازخورد سه ماه, تحلیل سودآوری هفتگی, سودآوری ماه گذشته, سود سه ماه, فایل گزارش برای احمد, سند پروژه برای علی, ارسال قرارداد برای سارا, فایل مالی برای محمد, ارسال سند برای مدیر, یادآوری وظایف, تحلیل رقبا, ارسال پیام به تیم, گزارش عملکرد ماهانه.
متن کاربر:`;

async function callOpenRouter(messages) {
  try {
    console.log('🔑 OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing');
    console.log('🤖 OpenRouter Model:', process.env.OPENROUTER_MODEL);
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: process.env.OPENROUTER_MODEL,
      messages: messages
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Dastyar Robin'
      },
      timeout: 30000
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('خطا در درخواست به OpenRouter:', error.message);
    if (error.response) {
      console.error('OpenRouter API Error:', error.response.status, error.response.data);
    } else if (error.code === 'ENOTFOUND') {
      console.error('مشکل اتصال به اینترنت یا DNS');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('اتصال رد شد');
    }
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
    if (intentResponse && intentResponse.trim() !== 'null' && intentResponse !== 'نامشخص' && actions[intentResponse.trim()]) {
      console.log(`⚡ در حال اجرای اکشن: ${intentResponse.trim()}`);
      actionResult = actions[intentResponse.trim()]();
    } else if (intentResponse && intentResponse.trim() === 'null') {
      console.log('null');
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