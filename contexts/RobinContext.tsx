"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getStoredHistory, saveHistory } from '@/utils/storage';

interface ChatMessage {
  user: string;
  robin: string;
  timestamp: Date;
}

interface RobinState {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  history: ChatMessage[];
  currentMessage: string;
  error: string | null;
  microphonePermission: boolean;
}

type RobinAction =
  | { type: 'SET_LISTENING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_MESSAGE'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MICROPHONE_PERMISSION'; payload: boolean }
  | { type: 'LOAD_HISTORY'; payload: ChatMessage[] }
  | { type: 'CLEAR_HISTORY' };

const initialState: RobinState = {
  isListening: false,
  isProcessing: false,
  isPlaying: false,
  history: [],
  currentMessage: '',
  error: null,
  microphonePermission: false,
};

function robinReducer(state: RobinState, action: RobinAction): RobinState {
  switch (action.type) {
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_CURRENT_MESSAGE':
      return { ...state, currentMessage: action.payload };
    case 'ADD_MESSAGE':
      const newHistory = [...state.history, action.payload];
      saveHistory(newHistory);
      return { ...state, history: newHistory };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MICROPHONE_PERMISSION':
      return { ...state, microphonePermission: action.payload };
    case 'LOAD_HISTORY':
      return { ...state, history: action.payload };
    case 'CLEAR_HISTORY':
      saveHistory([]);
      return { ...state, history: [] };
    default:
      return state;
  }
}

const RobinContext = createContext<{
  state: RobinState;
  dispatch: React.Dispatch<RobinAction>;
} | null>(null);

export function RobinProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(robinReducer, initialState);

  useEffect(() => {
    // Load chat history on component mount
    const storedHistory = getStoredHistory();
    dispatch({ type: 'LOAD_HISTORY', payload: storedHistory });

    // Request microphone permission with delay
    const timer = setTimeout(() => {
      requestMicrophonePermission();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 درخواست دسترسی میکروفون...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ دسترسی میکروفون موفق');
      dispatch({ type: 'SET_MICROPHONE_PERMISSION', payload: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ خطا در دسترسی میکروفون:', error);
      dispatch({ type: 'SET_MICROPHONE_PERMISSION', payload: false });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `دسترسی به میکروفون امکان‌پذیر نیست: ${error.message}. لطفاً دسترسی را در تنظیمات مرورگر فعال کنید.` 
      });
    }
  };

  return (
    <RobinContext.Provider value={{ state, dispatch }}>
      {children}
    </RobinContext.Provider>
  );
}

export function useRobin() {
  const context = useContext(RobinContext);
  if (!context) {
    throw new Error('useRobin must be used within a RobinProvider');
  }
  return context;
}