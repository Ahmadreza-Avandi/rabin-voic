import { useState, useRef, useEffect } from "react";
import { playAudio, startListening, stopListening, enableAudio, isSpeechRecognitionSupported } from "../utils/speech";

interface VoiceAssistantProps {
    onTranscript?: (text: string) => void;
    onResponse?: (response: string) => void;
}

export default function VoiceAssistant({ onTranscript, onResponse }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [error, setError] = useState('');

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Auto-enable audio on first user interaction
        const handleFirstInteraction = async () => {
            try {
                await enableAudio();
                setAudioEnabled(true);
                console.log('Audio enabled on first interaction');
            } catch (error) {
                console.error('Failed to enable audio:', error);
            }
        };

        // Add multiple event listeners for better coverage
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        events.forEach(event => {
            document.addEventListener(event, handleFirstInteraction, { once: true });
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleFirstInteraction);
            });
        };
    }, []);

    const handleStartListening = async () => {
        if (!isSpeechRecognitionSupported()) {
            setError('تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود');
            return;
        }

        try {
            setError('');
            setTranscript('');
            setResponse('');

            recognitionRef.current = startListening({
                onResult: (text: string) => {
                    setTranscript(text);
                    onTranscript?.(text);
                },
                onEnd: async (finalText: string) => {
                    setIsListening(false);
                    console.log('Final transcript:', finalText);

                    if (finalText.trim()) {
                        // Send to AI and get response
                        await handleAIResponse(finalText);
                    }
                },
                onError: (errorMsg: string) => {
                    setError(errorMsg);
                    setIsListening(false);
                }
            });

            setIsListening(true);
        } catch (error: any) {
            setError(`خطا در شروع تشخیص گفتار: ${error.message}`);
        }
    };

    const handleStopListening = () => {
        if (recognitionRef.current) {
            stopListening(recognitionRef.current);
            setIsListening(false);
        }
    };

    const handleAIResponse = async (userText: string) => {
        try {
            setIsPlaying(true);

            // Call your AI API here - replace with your actual endpoint
            const aiResponse = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userText }),
            });

            if (!aiResponse.ok) {
                throw new Error('خطا در دریافت پاسخ از AI');
            }

            const data = await aiResponse.json();
            const responseText = data.response || 'متاسفانه نتوانستم پاسخ مناسبی تولید کنم.';

            setResponse(responseText);
            onResponse?.(responseText);

            // Play the response
            await playAudio(responseText);

        } catch (error: any) {
            const errorMsg = `خطا در پردازش: ${error.message}`;
            setError(errorMsg);
            setResponse(errorMsg);

            // Try to play error message
            try {
                await playAudio(errorMsg);
            } catch (playError) {
                console.error('Failed to play error message:', playError);
            }
        } finally {
            setIsPlaying(false);
        }
    };

    const handleTestTTS = async () => {
        const testText = 'سلام! من رابین هستم، دستیار هوشمند شما. چطور می‌تونم کمکتون کنم؟';

        try {
            setIsPlaying(true);
            setResponse(testText);
            await playAudio(testText);
        } catch (error: any) {
            setError(`خطا در پخش صدا: ${error.message}`);
        } finally {
            setIsPlaying(false);
        }
    };

    const handleEnableAudio = async () => {
        try {
            await enableAudio();
            setAudioEnabled(true);
            setError('');
        } catch (error: any) {
            setError(`خطا در فعال‌سازی صدا: ${error.message}`);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">🤖 دستیار صوتی رابین</h1>

            {/* Audio Enable Button */}
            {!audioEnabled && (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 mb-3 font-semibold">
                        برای استفاده از قابلیت‌های صوتی، ابتدا صدا را فعال کنید
                    </p>
                    <button
                        onClick={handleEnableAudio}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        🔊 فعال‌سازی صدا
                    </button>
                </div>
            )}

            {/* Status Display */}
            <div className="mb-8">
                {isListening ? (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse shadow-lg">
                            <div className="w-10 h-10 bg-white rounded-full"></div>
                        </div>
                        <p className="text-red-600 font-semibold text-lg">🎤 در حال گوش دادن...</p>
                    </div>
                ) : isPlaying ? (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-lg">
                            <div className="w-10 h-10 bg-white rounded-full"></div>
                        </div>
                        <p className="text-green-600 font-semibold text-lg">🔊 در حال پخش پاسخ...</p>
                    </div>
                ) : (
                    <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg hover:bg-blue-600 transition-colors cursor-pointer">
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Control Buttons */}
            <div className="space-y-4 mb-6">
                {!isListening && !isPlaying ? (
                    <div className="space-y-3">
                        <button
                            onClick={handleStartListening}
                            disabled={!audioEnabled}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg text-lg"
                        >
                            🎙️ شروع گفتگو
                        </button>
                        <button
                            onClick={handleTestTTS}
                            disabled={!audioEnabled}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                        >
                            🔊 تست صدا
                        </button>
                    </div>
                ) : isListening ? (
                    <button
                        onClick={handleStopListening}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg text-lg"
                    >
                        ⏹️ توقف گوش دادن
                    </button>
                ) : (
                    <div className="text-gray-500 font-semibold">
                        لطفاً منتظر بمانید...
                    </div>
                )}
            </div>

            {/* Transcript Display */}
            {transcript && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <p className="text-blue-800 font-semibold mb-2">📝 متن شما:</p>
                    <p className="text-gray-700 text-right">{transcript}</p>
                </div>
            )}

            {/* Response Display */}
            {response && (
                <div className="mb-6 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                    <p className="text-green-800 font-semibold mb-2">🤖 پاسخ رابین:</p>
                    <p className="text-gray-700 text-right">{response}</p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <p className="text-red-800 font-semibold mb-2">❌ خطا:</p>
                    <p className="text-red-700 text-right">{error}</p>
                </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                <p className="mb-1">💡 راهنما:</p>
                <p>• ابتدا صدا را فعال کنید</p>
                <p>• روی "شروع گفتگو" کلیک کنید و صحبت کنید</p>
                <p>• رابین پاسخ شما را می‌شنود و جواب می‌دهد</p>
                <p>• برای تست، روی "تست صدا" کلیک کنید</p>
            </div>
        </div>
    );
}