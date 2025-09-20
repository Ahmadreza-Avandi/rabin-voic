interface ChatMessage {
  user: string;
  robin: string;
  timestamp: Date;
}

interface ProcessMessageResponse {
  response: string;
  intent?: string;
  actionExecuted?: boolean;
}

// API Base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

// Process user message with AI
export const processMessage = async (
  userMessage: string, 
  history: ChatMessage[]
): Promise<ProcessMessageResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        history: history.map(h => ({
          user: h.user,
          robin: h.robin
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'خطا در برقراری ارتباط با سرور');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('خطا در برقراری ارتباط با سرور');
  }
};

// Convert text to speech
export const convertTextToSpeech = async (text: string): Promise<{
  success: boolean;
  audioUrl?: string;
  audioBase64?: string;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tts/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'خطا در تبدیل متن به گفتار');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('TTS API Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطای نامشخص'
    };
  }
};

// Health check for API
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Retry mechanism for API calls
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error = new Error('تمام تلاش‌ها ناموفق بود');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('خطای نامشخص');
      
      if (attempt === maxRetries) {
        break;
      }

      console.warn(`تلاش ${attempt} ناموفق بود. تلاش مجدد در ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }

  throw lastError;
};