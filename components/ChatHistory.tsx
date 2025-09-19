"use client";

import React, { useEffect, useRef } from 'react';
import { Trash2, User, Bot } from 'lucide-react';
import { useRobin } from '@/contexts/RobinContext';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

const ChatHistory: React.FC = () => {
  const { state, dispatch } = useRobin();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.history]);

  const handleClearHistory = () => {
    if (window.confirm('آیا می‌خواهید تاریخچه گفتگو را پاک کنید؟')) {
      dispatch({ type: 'CLEAR_HISTORY' });
    }
  };

  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: faIR 
      });
    } catch {
      return 'همین الان';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-green-800 flex items-center">
          <Bot className="w-5 h-5 ml-2" />
          تاریخچه گفتگو
        </h2>
        {state.history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
            title="پاک کردن تاریخچه"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {state.history.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>هنوز گفتگویی انجام نداده‌اید</p>
            <p className="text-sm mt-1">با فشردن دکمه میکروفون شروع کنید</p>
          </div>
        ) : (
          state.history.map((message, index) => (
            <div key={index} className="space-y-3 message-enter">
              {/* User Message */}
              <div className="flex items-start space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="bg-blue-50 rounded-lg p-3 max-w-[85%] flex-1">
                  <p className="text-sm text-blue-900">{message.user}</p>
                  <span className="text-xs text-blue-600 mt-1 block">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>

              {/* Robin Response */}
              <div className="flex items-start space-x-2 space-x-reverse">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-green-50 rounded-lg p-3 max-w-[85%] flex-1">
                  <p className="text-sm text-green-900">{message.robin}</p>
                  <span className="text-xs text-green-600 mt-1 block">
                    رابین
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Current Activity Indicator */}
      {(state.isListening || state.isProcessing || state.isPlaying) && (
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <Bot className="w-3 h-3 text-yellow-800" />
            </div>
            <div className="text-sm text-gray-600">
              {state.isListening && "در حال گوش دادن..."}
              {state.isProcessing && "در حال پردازش..."}
              {state.isPlaying && "در حال پخش پاسخ..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;