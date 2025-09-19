interface ChatMessage {
  user: string;
  robin: string;
  timestamp: Date;
}

const STORAGE_KEY = 'dastyar_robin_history';
const MAX_HISTORY_ITEMS = 50; // Maximum number of messages to store

// Save chat history to localStorage
export const saveHistory = (history: ChatMessage[]): void => {
  try {
    // Keep only the last MAX_HISTORY_ITEMS messages
    const trimmedHistory = history.slice(-MAX_HISTORY_ITEMS);
    
    const serializedHistory = JSON.stringify(trimmedHistory, (key, value) => {
      // Convert Date objects to ISO strings for storage
      if (key === 'timestamp' && value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    
    localStorage.setItem(STORAGE_KEY, serializedHistory);
  } catch (error) {
    console.error('خطا در ذخیره تاریخچه:', error);
  }
};

// Load chat history from localStorage
export const getStoredHistory = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Convert ISO strings back to Date objects
    return parsed.map((message: any) => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
  } catch (error) {
    console.error('خطا در بارگیری تاریخچه:', error);
    return [];
  }
};

// Clear chat history
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('خطا در پاک کردن تاریخچه:', error);
  }
};

// Check if localStorage is available
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

// Export chat history as JSON file
export const exportHistory = (history: ChatMessage[]): void => {
  try {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dastyar-robin-history-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('خطا در صدور تاریخچه:', error);
  }
};

// Import chat history from JSON file
export const importHistory = (file: File): Promise<ChatMessage[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validate and convert data
        const history = parsed.map((message: any) => ({
          user: message.user || '',
          robin: message.robin || '',
          timestamp: new Date(message.timestamp || new Date())
        }));
        
        resolve(history);
      } catch (error) {
        reject(new Error('فایل نامعتبر است'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('خطا در خواندن فایل'));
    };
    
    reader.readAsText(file);
  });
};