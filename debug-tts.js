// Debug script to test TTS API directly
const testTTS = async () => {
  const testText = 'سلام! این یک تست است.';
  
  try {
    console.log('Testing TTS API...');
    
    const response = await fetch('https://api.ahmadreza-avandi.ir/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dastyar-Robin/1.0'
      },
      body: JSON.stringify({
        text: testText,
        speaker: "3",
        checksum: "1",
        filePath: "true",
        base64: "0"
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data?.data?.status === 'success' && data?.data?.data?.filePath) {
      const filePath = data.data.data.filePath;
      const audioUrl = `https://api.ahmadreza-avandi.ir/${filePath}`;
      
      console.log('Generated audio URL:', audioUrl);
      
      // Test URL accessibility
      const testResponse = await fetch(audioUrl, { method: 'HEAD' });
      console.log('Audio URL test:', testResponse.status, testResponse.statusText);
      
      if (testResponse.ok) {
        console.log('✅ Audio URL is accessible');
      } else {
        console.log('❌ Audio URL is not accessible');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run if in Node.js environment
if (typeof window === 'undefined') {
  testTTS();
}