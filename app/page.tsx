"use client";

import { useState, useEffect } from 'react';
import MicrophoneButton from '@/components/MicrophoneButton';
import ChatHistory from '@/components/ChatHistory';
import { RobinProvider } from '@/contexts/RobinContext';
import { MessageSquare } from 'lucide-react';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
        <div className="text-2xl text-green-800 font-vazir">
          در حال بارگذاری دستیار رابین...
        </div>
      </div>
    );
  }

  return (
    <RobinProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 font-vazir">
        {/* Header */}
        <header className="text-center py-8 relative">
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            دستیار رابین
          </h1>
          <p className="text-lg text-green-600">
            دستیار هوشمند صوتی شما
          </p>
          
          {/* History Toggle Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="absolute top-8 left-8 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-green-600 hover:text-green-800"
            title="نمایش تاریخچه گفتگو"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4">
          <div className="flex justify-center">
            {/* Microphone Button - Always Center */}
            <div className="flex items-center justify-center min-h-[400px]">
              <MicrophoneButton />
            </div>
          </div>
        </main>

        {/* Chat History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-green-800">تاریخچه گفتگو</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-96">
                <ChatHistory />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 mt-16">
          <p className="text-green-600">
            میکروفون خودکار فعال است - فقط شروع به صحبت کنید
          </p>
        </footer>
      </div>
    </RobinProvider>
  );
}