import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Fix URL if it doesn't have protocol
    if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
      audioUrl = `https://${audioUrl}`;
    }

    console.log('Proxying audio URL:', audioUrl);

    // Fetch the audio file
    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Dastyar-Robin/1.0',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch audio:', response.status, response.statusText);
      return NextResponse.json({ 
        error: `Failed to fetch audio: ${response.status}` 
      }, { status: response.status });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Return the audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    console.error('Audio proxy error:', error.message);
    return NextResponse.json({
      error: 'خطا در دریافت فایل صوتی',
    }, { status: 500 });
  }
}