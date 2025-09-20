"use client";

import { useState, useEffect } from 'react';
import MicrophoneButton from '@/components/MicrophoneButton';
import ChatHistory from '@/components/ChatHistory';
import { RobinProvider } from '@/contexts/RobinContext';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

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
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            دستیار رابین
          </h1>
          <p className="text-lg text-green-600">
            دستیار هوشمند صوتی شما
          </p>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Chat History */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <ChatHistory />
            </div>

            {/* Microphone Button */}
            <div className="lg:col-span-2 order-1 lg:order-2 flex items-center justify-center min-h-[400px]">
              <MicrophoneButton />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-8 mt-16">
          <p className="text-green-600">
            رابین آماده گوش دادن است - شروع به صحبت کنید
          </p>
        </footer>
      </div>
    </RobinProvider>
  );
}