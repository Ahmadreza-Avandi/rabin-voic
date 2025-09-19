// Speech Recognition Interface
interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onEnd: (finalTranscript: string) => void;
  onError: (error: string) => void;
}

// Check if speech recognition is supported
export const isSpeechRecognitionSupported = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

// Start listening to user speech
export const startListening = (options: SpeechRecognitionOptions): any => {
  if (!isSpeechRecognitionSupported()) {
    options.onError('تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'fa-IR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  let interimTranscript = '';

  recognition.onresult = (event: any) => {
    interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Send current transcript (final + interim)
    const currentTranscript = finalTranscript + interimTranscript;
    options.onResult(currentTranscript);
  };

  recognition.onend = () => {
    // Clean up transcript and send final result
    const cleanTranscript = finalTranscript.trim();
    options.onEnd(cleanTranscript);
  };

  recognition.onerror = (event: any) => {
    let errorMessage = 'خطای نامشخص در تشخیص گفتار';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'صدایی شنیده نشد. لطفاً دوباره تلاش کنید.';
        break;
      case 'audio-capture':
        errorMessage = 'خطا در دسترسی به میکروفون';
        break;
      case 'not-allowed':
        errorMessage = 'دسترسی به میکروفون رد شد';
        break;
      case 'network':
        errorMessage = 'خطا در اتصال به اینترنت';
        break;
      case 'service-not-allowed':
        errorMessage = 'سرویس تشخیص گفتار دردسترس نیست';
        break;
    }
    
    options.onError(errorMessage);
  };

  recognition.start();
  return recognition;
};

// Stop listening
export const stopListening = (recognition: any): void => {
  if (recognition) {
    recognition.stop();
  }
};

// Convert text to speech using external API
export const textToSpeech = async (text: string): Promise<string> => {
  try {
    const API_BASE_URL = process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://localhost:3001/api';
      
    const response = await fetch(`${API_BASE_URL}/tts/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('خطا در تبدیل متن به گفتار');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'خطا در تبدیل متن به گفتار');
    }

    console.log('TTS Response:', data);
    
    // Return audio URL or base64
    return data.audioUrl || data.audioBase64;
  } catch (error) {
    console.error('TTS Error:', error);
    throw new Error('خطا در تبدیل متن به گفتار');
  }
};

// Play audio from URL or base64
export const playAudio = async (text: string): Promise<void> => {
  try {
    console.log('Starting TTS for text:', text);
    
    // Get audio from TTS service
    const audioData = await textToSpeech(text);
    
    console.log('Received audio data:', audioData ? 'Success' : 'Failed');
    
    if (!audioData) {
      throw new Error('دریافت فایل صوتی ناموفق بود');
    }
    
    let audioSrc: string;
    
    // Check if it's base64 or URL
    if (audioData.startsWith('data:audio') || audioData.startsWith('http') || audioData.startsWith('https')) {
      audioSrc = audioData;
    } else {
      // Assume it's base64 without prefix
      audioSrc = `data:audio/mpeg;base64,${audioData}`;
    }

    console.log('Audio source prepared:', audioSrc.substring(0, 50) + '...');

    // Create and play audio
    const audio = new Audio(audioSrc);
    
    // Set volume
    audio.volume = 0.8;
    
    return new Promise((resolve, reject) => {
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
      });
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play');
      });
      
      audio.addEventListener('loadeddata', () => {
        console.log('Audio data loaded');
      });
      
      audio.addEventListener('ended', () => resolve());
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error details:', audio.error);
        reject(new Error(`خطا در پخش صدا: ${audio.error?.message || 'نامشخص'}`));
      });
      
      console.log('Starting audio playback...');
      audio.play().catch((error) => {
        console.error('Audio play error:', error);
        reject(new Error(`خطا در شروع پخش: ${error.message}`));
      });
    });
    
  } catch (error) {
    console.error('Play audio error:', error);
    throw error;
  }
};

// Check microphone permission
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission error:', error);
    return false;
  }
};