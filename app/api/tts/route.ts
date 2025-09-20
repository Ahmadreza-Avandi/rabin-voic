import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'متن الزامی است' }, { status: 400 });
    }

    // Don't limit text length here - let the client handle chunking
    let processedText = text.trim();

    console.log('TTS Request for text:', processedText);
    console.log('Text length:', processedText.length);

    // Use the new API endpoint you provided
    const ttsUrl = 'https://partai.gw.isahab.ir/TextToSpeech/v1/speech-synthesys';
    console.log('Sending request to new TTS API:', ttsUrl);

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'gateway-token': 'eyJhbGciOiJIUzI1NiJ9.eyJzeXN0ZW0iOiJzYWhhYiIsImNyZWF0ZVRpbWUiOiIxNDA0MDYwNDIxMTQ1NDgyNCIsInVuaXF1ZUZpZWxkcyI6eyJ1c2VybmFtZSI6ImU2ZTE2ZWVkLTkzNzEtNGJlOC1hZTBiLTAwNGNkYjBmMTdiOSJ9LCJncm91cE5hbWUiOiJkZjk4NTY2MTZiZGVhNDE2NGQ4ODMzZmRkYTUyOGUwNCIsImRhdGEiOnsic2VydmljZUlEIjoiZGY1M2E3ODAtMjE1OC00NTI0LTkyNDctYzZmMGJhZDNlNzcwIiwicmFuZG9tVGV4dCI6InJtWFJSIn19.6wao3Mps4YOOFh-Si9oS5JW-XZ9RHR58A1CWgM0DUCg'
      },
      body: JSON.stringify({
        data: processedText,
        filePath: "true",
        base64: "0",
        checksum: "1",
        speaker: "3"
      }),
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log('TTS API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API Error Response:', errorText);
      throw new Error(`TTS API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('TTS API Response:', JSON.stringify(data, null, 2));

    // Handle the new API response structure
    if (data?.data?.status === 'success' && data?.data?.data?.filePath) {
      const filePath = data.data.data.filePath;
      
      // Use our proxy to avoid CORS issues
      const audioUrl = `/api/audio-proxy?url=${encodeURIComponent(filePath)}`;
      
      console.log('Extracted filePath:', filePath);
      console.log('Proxied audio URL:', audioUrl);
      
      return NextResponse.json({
        success: true,
        audioUrl: audioUrl,
        directUrl: filePath,
        checksum: data.data.data.checksum,
        base64: data.data.data.base64 || null
      });
    } else {
      console.error('Invalid TTS response structure:', data);
      throw new Error('پاسخ نامعتبر از سرور TTS');
    }

  } catch (error: any) {
    console.error('TTS Error:', error.message);
    
    // Return more specific error messages
    let errorMessage = 'خطا در تبدیل متن به صدا';
    if (error.message.includes('timeout')) {
      errorMessage = 'زمان انتظار به پایان رسید. لطفاً دوباره تلاش کنید.';
    } else if (error.message.includes('500')) {
      errorMessage = 'خطا در سرور TTS. لطفاً متن کوتاه‌تری امتحان کنید.';
    } else if (error.message.includes('network')) {
      errorMessage = 'خطا در اتصال به اینترنت';
    }
    
    return NextResponse.json({
      error: errorMessage,
      success: false
    }, { status: 500 });
  }
}