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
  // Stop automatically after short silence (we manage it with a timer)
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  let interimTranscript = '';

  let silenceTimer: any = null;

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      try { recognition.stop(); } catch { }
    }, 1200);
  };

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

    // Reset silence timer on each chunk
    resetSilenceTimer();

    // Send current transcript (final + interim)
    const currentTranscript = (finalTranscript + ' ' + interimTranscript).trim();
    options.onResult(currentTranscript);
  };

  // Debug and safety timers
  const maxDurationTimer: any = setTimeout(() => {
    try { recognition.stop(); } catch { }
  }, 10000);

  recognition.onend = () => {
    // Clean up timer
    if (maxDurationTimer) clearTimeout(maxDurationTimer);

    // Clean up transcript and send final result (use interim if final not produced)
    const cleanTranscript = (finalTranscript + interimTranscript).trim();
    options.onEnd(cleanTranscript);
  };

  recognition.onerror = (event: any) => {
    // Clean up timer on error
    if (maxDurationTimer) clearTimeout(maxDurationTimer);

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

  recognition.onstart = () => console.log('SpeechRecognition started');
  recognition.onspeechstart = () => console.log('Speech detected');
  recognition.onspeechend = () => console.log('Speech ended');
  recognition.onaudioend = () => console.log('Audio capture ended');

  recognition.start();
  return recognition;
};

// Stop listening
export const stopListening = (recognition: any): void => {
  if (recognition) {
    recognition.stop();
  }
};

// Convert text to speech using local API proxy
// Text to speech function
export const textToSpeech = async (text: string): Promise<string> => {
  try {
    console.log('TTS: Starting request for text:', text);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API Error:', errorText);
      throw new Error(`خطا در تبدیل متن به گفتار: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.audioUrl) {
      throw new Error(data.error || 'خطا در دریافت فایل صوتی');
    }

    console.log('TTS Success, audio URL:', data.audioUrl);
    return data.audioUrl;

  } catch (error: any) {
    console.error('TTS Error:', error.message);
    throw new Error('خطا در تبدیل متن به گفتار');
  }
};

// Initialize audio context on user interaction
let audioContext: AudioContext | null = null;
let isAudioEnabled = false;
let userHasInteracted = false;

// Track user interaction for autoplay policy
const trackUserInteraction = () => {
  if (!userHasInteracted) {
    userHasInteracted = true;
    console.log('User interaction detected, audio enabled');
  }
};

// Add event listeners for user interaction
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach(event => {
    document.addEventListener(event, trackUserInteraction, { once: true });
  });
}

export const enableAudio = async (): Promise<void> => {
  try {
    console.log('Enabling audio context...');
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Created new AudioContext, state:', audioContext.state);
    }

    if (audioContext.state === 'suspended') {
      console.log('AudioContext is suspended, resuming...');
      await audioContext.resume();
      console.log('AudioContext resumed, new state:', audioContext.state);
    }

    // Test audio context with a silent sound
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime); // Silent
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.01);
      
      console.log('AudioContext test successful');
    } catch (testError) {
      console.warn('AudioContext test failed:', testError);
    }

    isAudioEnabled = true;
    userHasInteracted = true;
    console.log('Audio context enabled successfully');
    
  } catch (error) {
    console.error('Failed to enable audio context:', error);
    // Still mark as enabled to allow HTML5 audio attempts
    isAudioEnabled = true;
    userHasInteracted = true;
  }
};

// Play audio from base64 data
export const playAudioFromBase64 = async (base64Data: string): Promise<void> => {
  try {
    console.log('Playing audio from base64 data');

    // Convert base64 to blob
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);

    console.log('Created blob URL from base64:', audioUrl);

    // Create and play audio
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.8;

    return new Promise((resolve, reject) => {
      let hasStarted = false;

      const attemptPlay = async () => {
        if (hasStarted) return;
        hasStarted = true;

        try {
          if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          await audio.play();
          console.log('Base64 audio playback started');
        } catch (playError: any) {
          if (playError.name === 'NotAllowedError') {
            console.log('Autoplay blocked for base64 audio');
            const playOnClick = async () => {
              try {
                if (audioContext && audioContext.state === 'suspended') {
                  await audioContext.resume();
                }
                await audio.play();
                console.log('Base64 audio started after click');
              } catch (retryError) {
                reject(retryError);
              }
            };
            document.addEventListener('click', playOnClick, { once: true });
            return;
          } else {
            reject(playError);
          }
        }
      };

      audio.oncanplaythrough = attemptPlay;
      audio.onloadeddata = attemptPlay;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
        console.log('Base64 audio playback finished');
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        console.error('Base64 audio error:', e);
        reject(new Error('خطا در پخش صدا از base64'));
      };

      audio.src = audioUrl;
      audio.load();
    });

  } catch (error: any) {
    console.error('Base64 audio error:', error);
    throw error;
  }
};

// Split long text into chunks
const splitTextIntoChunks = (text: string, maxLength = 250): string[] => {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?؟]/);
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const sentenceWithPunctuation = trimmedSentence + '.';
    
    if ((currentChunk + sentenceWithPunctuation).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = sentenceWithPunctuation;
      } else {
        // Single sentence is too long, split by words
        const words = trimmedSentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if ((wordChunk + word).length <= maxLength - 1) {
            wordChunk += (wordChunk ? ' ' : '') + word;
          } else {
            if (wordChunk) {
              chunks.push(wordChunk + '.');
              wordChunk = word;
            } else {
              // Single word is too long, just add it
              chunks.push(word + '.');
            }
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk + '.';
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
};

// Play multiple audio chunks sequentially
export const playAudioChunks = async (chunks: string[]): Promise<void> => {
  console.log(`Playing ${chunks.length} audio chunks`);
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Playing chunk ${i + 1}/${chunks.length}: ${chunks[i].substring(0, 50)}...`);
    
    try {
      await playAudioSingle(chunks[i]);
      
      // Small delay between chunks for better experience
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Error playing chunk ${i + 1}:`, error);
      // Continue with next chunk even if one fails
    }
  }
  
  console.log('All audio chunks completed');
};

// Play audio from URL or base64
// Play audio function with chunking support
export const playAudio = async (text: string): Promise<void> => {
  try {
    console.log('Starting TTS for text:', text);
    console.log('Text length:', text.length);

    // Split text into chunks if it's too long
    const chunks = splitTextIntoChunks(text, 250);
    
    if (chunks.length > 1) {
      console.log(`Text split into ${chunks.length} chunks`);
      await playAudioChunks(chunks);
    } else {
      console.log('Playing single chunk');
      await playAudioSingle(text);
    }

  } catch (error: any) {
    console.error('Play audio error:', error);
    throw error;
  }
};

// Play single audio chunk with retry mechanism
export const playAudioSingle = async (text: string, retryCount = 0): Promise<void> => {
  const maxRetries = 2;
  
  try {
    console.log('Starting TTS for single chunk:', text.substring(0, 50) + '...');
    console.log('Retry attempt:', retryCount);

    // Get TTS response
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS API Error:', errorText);
      
      // If it's a 500 error and we haven't exceeded retries, try again
      if (response.status === 500 && retryCount < maxRetries) {
        console.log(`Retrying TTS request (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return playAudioSingle(text, retryCount + 1);
      }
      
      throw new Error(`خطا در تبدیل متن به گفتار: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'خطا در دریافت فایل صوتی');
    }

    console.log('TTS Response for chunk:', data.audioUrl ? 'URL received' : 'No URL');

    // Try base64 first if available, then fallback to URL
    if (data.base64) {
      console.log('Using base64 audio data');
      await playAudioFromBase64(data.base64);
    } else if (data.audioUrl) {
      console.log('Using audio URL:', data.audioUrl);
      await playAudioFromURL(data.audioUrl);
    } else {
      throw new Error('هیچ داده صوتی دریافت نشد');
    }

  } catch (error: any) {
    console.error('Play single audio error:', error);
    
    // If it's a network error and we haven't exceeded retries, try again
    if (error.message.includes('Failed to fetch') && retryCount < maxRetries) {
      console.log(`Retrying due to network error (${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return playAudioSingle(text, retryCount + 1);
    }
    
    throw error;
  }
};

// Play audio from URL
export const playAudioFromURL = async (audioUrl: string): Promise<void> => {
  try {
    console.log('Playing audio from URL:', audioUrl);

    // Create audio element
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.8;
    audio.crossOrigin = 'anonymous';

    // Return promise that handles the audio playback
    return new Promise((resolve, reject) => {
      let hasStarted = false;
      let timeoutId: any = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const attemptPlay = async () => {
        if (hasStarted) return;
        hasStarted = true;
        
        console.log('Audio ready, attempting playback');

        try {
          // Ensure AudioContext is resumed before playing
          if (audioContext && audioContext.state === 'suspended') {
            console.log('Resuming AudioContext...');
            await audioContext.resume();
          }

          // Try to play
          await audio.play();
          console.log('Audio playback started successfully');
          
        } catch (playError: any) {
          console.error('Play failed:', playError);
          
          if (playError.name === 'NotAllowedError') {
            console.log('Autoplay blocked - need user interaction');
            
            // Show user message and wait for interaction
            const playOnClick = async (event: Event) => {
              event.preventDefault();
              try {
                // Resume AudioContext if needed
                if (audioContext && audioContext.state === 'suspended') {
                  await audioContext.resume();
                }
                
                await audio.play();
                console.log('Audio started after user interaction');
                
                // Remove event listeners
                document.removeEventListener('click', playOnClick);
                document.removeEventListener('touchstart', playOnClick);
                document.removeEventListener('keydown', playOnClick);
                
              } catch (retryError) {
                console.error('Retry play failed:', retryError);
                cleanup();
                reject(new Error('خطا در پخش صدا پس از کلیک'));
              }
            };

            // Add event listeners
            document.addEventListener('click', playOnClick, { once: true });
            document.addEventListener('touchstart', playOnClick, { once: true });
            document.addEventListener('keydown', playOnClick, { once: true });
            
            console.log('برای پخش صدا، روی صفحه کلیک کنید');
            return; // Don't reject, wait for user interaction
            
          } else {
            cleanup();
            reject(new Error(`خطا در پخش صدا: ${playError.message}`));
          }
        }
      };

      // Event handlers
      audio.oncanplaythrough = attemptPlay;
      audio.onloadeddata = () => {
        console.log('Audio data loaded');
        // Try to play immediately if can play through hasn't fired
        if (!hasStarted) {
          attemptPlay();
        }
      };

      audio.onended = () => {
        console.log('Audio playback finished');
        cleanup();
        resolve();
      };

      audio.onerror = (e) => {
        console.error('Audio error:', e);
        cleanup();
        reject(new Error('خطا در بارگذاری فایل صوتی'));
      };

      audio.onloadstart = () => console.log('Audio loading started');
      audio.onloadedmetadata = () => console.log('Audio metadata loaded');

      // Set source and start loading
      audio.src = audioUrl;
      audio.load();

      // Timeout fallback
      timeoutId = setTimeout(() => {
        if (!hasStarted) {
          cleanup();
          reject(new Error('زمان انتظار برای بارگذاری صدا به پایان رسید'));
        }
      }, 20000); // Increased timeout
    });

  } catch (error: any) {
    console.error('Play audio from URL error:', error);
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