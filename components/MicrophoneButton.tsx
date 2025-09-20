"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { useRobin } from '@/contexts/RobinContext';
import { startListening, stopListening, playAudio, enableAudio } from '@/utils/speech';
import { processMessage } from '@/utils/api';

const MicrophoneButton: React.FC = () => {
  const { state, dispatch } = useRobin();
  const recognitionRef = useRef<any>(null);
  const [buttonText, setButtonText] = useState('شروع گفتگو');
  const autoStartRef = useRef<boolean>(false);

  // Auto-start listening when permission is granted
  React.useEffect(() => {
    if (state.microphonePermission && state.isListening && !autoStartRef.current) {
      autoStartRef.current = true;
      startListeningProcess();
    }
  }, [state.microphonePermission, state.isListening]);

  const startListeningProcess = async () => {
    if (!state.microphonePermission) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'دسترسی به میکروفون لازم است. لطفاً صفحه را رفرش کنید و دسترسی را بدهید.'
      });
      return;
    }

    dispatch({ type: 'SET_ERROR', payload: null });
    setButtonText('در حال گوش دادن...');

    try {
      recognitionRef.current = startListening({
        onResult: (transcript: string) => {
          dispatch({ type: 'SET_CURRENT_MESSAGE', payload: transcript });
        },
        onEnd: async (finalTranscript: string) => {
          dispatch({ type: 'SET_LISTENING', payload: false });
          setButtonText('در حال پردازش...');

          const messageToSend = finalTranscript.trim() || state.currentMessage.trim();
          if (messageToSend) {
            dispatch({ type: 'SET_PROCESSING', payload: true });

            try {
              const response = await processMessage(messageToSend, state.history);

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

              // Auto-restart listening after response
              setTimeout(() => {
                if (state.microphonePermission) {
                  dispatch({ type: 'SET_LISTENING', payload: true });
                  startListeningProcess();
                }
              }, 500); // کاهش تاخیر برای پاسخ سریع‌تر

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
            // Auto-restart listening if no speech detected
            setTimeout(() => {
              if (state.microphonePermission) {
                dispatch({ type: 'SET_LISTENING', payload: true });
                startListeningProcess();
              }
            }, 500);
          }
        },
        onError: (error: string) => {
          dispatch({ type: 'SET_LISTENING', payload: false });
          dispatch({ type: 'SET_ERROR', payload: error });
          setButtonText('شروع گفتگو');

          // Auto-restart listening after error
          setTimeout(() => {
            dispatch({ type: 'SET_LISTENING', payload: true });
            startListeningProcess();
          }, 2000);
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
    // Enable audio on first user interaction
    await enableAudio();
    
    if (state.isListening) {
      // Stop listening
      stopListening(recognitionRef.current);
      dispatch({ type: 'SET_LISTENING', payload: false });
      setButtonText('شروع گفتگو');
      autoStartRef.current = false;
    } else if (state.isProcessing || state.isPlaying) {
      // Cannot start while processing or playing
      return;
    } else {
      // Start listening manually
      dispatch({ type: 'SET_LISTENING', payload: true });
      startListeningProcess();
      // Provide immediate visual feedback
      setButtonText('در حال گوش دادن...');
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
        disabled={state.isProcessing}
        className={getButtonClasses()}
      >
        {renderIcon()}
        <span className="text-xs mt-1 px-2 text-center leading-tight">
          {buttonText}
        </span>
      </button>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg max-w-md text-center">
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {/* Simple Status */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${state.microphonePermission ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          <div className={`w-2 h-2 rounded-full ml-2 ${state.microphonePermission ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          {state.microphonePermission ? 'آماده برای گفتگو' : 'میکروفون غیرفعال'}
        </div>
      </div>
    </div>
  );
};

export default MicrophoneButton;