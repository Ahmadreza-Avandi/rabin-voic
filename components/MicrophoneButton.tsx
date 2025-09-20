"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { useRobin } from '@/contexts/RobinContext';
import { startListening, stopListening, playAudio } from '@/utils/speech';
import { processMessage } from '@/utils/api';

const MicrophoneButton: React.FC = () => {
  const { state, dispatch } = useRobin();
  const recognitionRef = useRef<any>(null);
  const [buttonText, setButtonText] = useState('شروع گفتگو');
  const [autoStarted, setAutoStarted] = useState(false);

  // Auto-start listening when microphone permission is granted
  useEffect(() => {
    if (state.microphonePermission && !autoStarted && !state.isListening && !state.isProcessing && !state.isPlaying) {
      console.log('🚀 شروع خودکار گوش دادن...');
      setAutoStarted(true);
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [state.microphonePermission, autoStarted, state.isListening, state.isProcessing, state.isPlaying]);

  const startListening = async () => {
    if (!state.microphonePermission) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'دسترسی به میکروفون لازم است. لطفاً دسترسی را بدهید و صفحه را رفرش کنید.' 
      });
      return;
    }

    if (state.isProcessing || state.isPlaying) {
      // Cannot start while processing or playing
      return;
    }

    // Start listening
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LISTENING', payload: true });
    setButtonText('در حال گوش دادن...');
    
    try {
      recognitionRef.current = startSpeechRecognition({
        onResult: (transcript: string) => {
          dispatch({ type: 'SET_CURRENT_MESSAGE', payload: transcript });
        },
        onEnd: async (finalTranscript: string) => {
          dispatch({ type: 'SET_LISTENING', payload: false });
          setButtonText('در حال پردازش...');
          
          if (finalTranscript.trim()) {
            dispatch({ type: 'SET_PROCESSING', payload: true });
            
            try {
              const response = await processMessage(finalTranscript, state.history);
              
              // Add to history
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  user: finalTranscript,
                  robin: response.response,
                  timestamp: new Date(),
                },
              });

              // Play audio response
              dispatch({ type: 'SET_PLAYING', payload: true });
              setButtonText('در حال پخش...');
              
              try {
                await playAudio(response.response);
              } catch (audioError) {
                console.error('Audio playback failed:', audioError);
                dispatch({ 
                  type: 'SET_ERROR', 
                  payload: 'پاسخ دریافت شد اما پخش صدا ناموفق بود.' 
                });
              }
              
              dispatch({ type: 'SET_PLAYING', payload: false });
              setButtonText('شروع گفتگو');
              
              // Auto-restart listening after response
              setTimeout(() => {
                if (state.microphonePermission) {
                  startListening();
                }
              }, 1000);
              
            } catch (error) {
              dispatch({ 
                type: 'SET_ERROR', 
                payload: 'خطا در پردازش پیام. لطفاً دوباره تلاش کنید.' 
              });
              setButtonText('شروع گفتگو');
            } finally {
              dispatch({ type: 'SET_PROCESSING', payload: false });
              dispatch({ type: 'SET_CURRENT_MESSAGE', payload: '' });
            }
          } else {
            setButtonText('شروع گفتگو');
            // Auto-restart listening even if no speech detected
            setTimeout(() => {
              if (state.microphonePermission) {
                startListening();
              }
            }, 2000);
          }
        },
        onError: (error: string) => {
          dispatch({ type: 'SET_LISTENING', payload: false });
          dispatch({ type: 'SET_ERROR', payload: error });
          setButtonText('شروع گفتگو');
          
          // Auto-restart listening after error
          setTimeout(() => {
            if (state.microphonePermission) {
              startListening();
            }
          }, 3000);
        },
      });
    } catch (error) {
      dispatch({ type: 'SET_LISTENING', payload: false });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'خطا در راه‌اندازی میکروفون. لطفاً دوباره تلاش کنید.' 
      });
      setButtonText('شروع گفتگو');
    }
  };

  const handleMicrophoneClick = async () => {
    if (state.isListening) {
      // Stop listening
      stopListening(recognitionRef.current);
      dispatch({ type: 'SET_LISTENING', payload: false });
      setButtonText('شروع گفتگو');
    } else {
      startListening();
    }
  };

  const getButtonState = () => {
    if (state.isListening) return 'listening';
    if (state.isProcessing) return 'processing';
    if (state.isPlaying) return 'playing';
    return 'ready';
  };

  const getButtonClasses = () => {
    const baseClasses = 'w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center text-white font-bold status-indicator';
    
    switch (getButtonState()) {
      case 'listening':
        return `${baseClasses} robin-gold listening-pulse cursor-pointer status-listening`;
      case 'processing':
        return `${baseClasses} bg-orange-500 processing-spin cursor-not-allowed status-processing`;
      case 'playing':
        return `${baseClasses} bg-blue-500 pulse-robin cursor-not-allowed status-listening`;
      default:
        return `${baseClasses} bg-green-600 hover:bg-green-700 cursor-pointer pulse-robin status-ready`;
    }
  };

  const renderIcon = () => {
    const iconSize = 32;
    
    switch (getButtonState()) {
      case 'listening':
        return <Mic size={iconSize} className="mb-1" />;
      case 'processing':
        return <Loader2 size={iconSize} className="mb-1 animate-spin" />;
      case 'playing':
        return <Volume2 size={iconSize} className="mb-1" />;
      default:
        return state.microphonePermission ? 
          <Mic size={iconSize} className="mb-1" /> : 
          <MicOff size={iconSize} className="mb-1" />;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Status Message */}
      {state.currentMessage && (
        <div className="bg-white p-4 rounded-lg shadow-lg max-w-md text-center message-enter">
          <p className="text-green-800 font-medium">
            "{state.currentMessage}"
          </p>
        </div>
      )}

      {/* Main Microphone Button */}
      <button
        onClick={handleMicrophoneClick}
        disabled={state.isProcessing || state.isPlaying}
        className={getButtonClasses()}
      >
        {renderIcon()}
        <span className="text-sm mt-1 px-2 text-center leading-tight">
          {buttonText}
        </span>
      </button>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg max-w-md text-center">
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* Status Information */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-4 space-x-reverse text-sm text-green-700">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ml-2 ${
              state.microphonePermission ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            میکروفون: {state.microphonePermission ? 'آماده' : 'غیرفعال'}
          </div>
        </div>
        
        {!state.isListening && !state.isProcessing && !state.isPlaying && (
          <p className="text-green-600 text-sm">
            برای شروع گفتگو، دکمه را فشار دهید
          </p>
        )}
      </div>
    </div>
  );
};

export default MicrophoneButton;