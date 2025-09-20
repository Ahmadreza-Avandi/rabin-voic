// Simple audio player using Web Audio API as fallback
export const playAudioWithWebAudio = async (audioUrl: string): Promise<void> => {
  try {
    console.log('Playing audio with Web Audio API:', audioUrl);
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Fetch audio data
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create source and connect to destination
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Play audio
    return new Promise((resolve, reject) => {
      source.onended = () => {
        console.log('Web Audio playback finished');
        resolve();
      };
      
      try {
        source.start(0);
        console.log('Web Audio playback started');
      } catch (error) {
        reject(error);
      }
    });
    
  } catch (error) {
    console.error('Web Audio API failed:', error);
    throw error;
  }
};

// Simple HTML5 audio player
export const playAudioSimple = async (audioUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    
    audio.oncanplaythrough = () => {
      console.log('Simple audio can play through');
      audio.play().then(() => {
        console.log('Simple audio started');
      }).catch(reject);
    };
    
    audio.onended = () => {
      console.log('Simple audio ended');
      resolve();
    };
    
    audio.onerror = () => {
      reject(new Error('Simple audio failed'));
    };
    
    audio.load();
  });
};