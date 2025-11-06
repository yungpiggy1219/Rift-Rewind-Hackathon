"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [summonerLevel, setSummonerLevel] = useState<number | null>(null);
  const [summonerIcon, setSummonerIcon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for tilt effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate mouse position relative to center (-1 to 1)
        const x = (e.clientX - centerX) / (rect.width / 2);
        const y = (e.clientY - centerY) / (rect.height / 2);
        
        setMousePosition({ x, y });
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = async (inputGameName: string, inputTagLine: string) => {
    setGameName(inputGameName);
    setTagLine(inputTagLine);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/summoner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameName: inputGameName, 
          tagLine: inputTagLine 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve summoner");
      }

      // Redirect to menu page
      router.push(`/menu/${data.puuid}?name=${encodeURIComponent(inputGameName)}&tag=${encodeURIComponent(inputTagLine)}`);
    } catch (error: unknown) {
      console.error("Error resolving summoner:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while resolving summoner"
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate tilt values based on mouse position
  const tiltX = mousePosition.y * 5; // Tilt up/down based on mouse Y
  const tiltY = mousePosition.x * -5; // Tilt left/right based on mouse X (inverted)

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 relative overflow-hidden"
    >
      {/* Background Image with Tilt Effect */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/images/backgrounds/background_2.jpg)',
          backgroundSize: '120%', // Larger to prevent white edges
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.1)`,
          transition: 'transform 0.15s ease-out',
          transformOrigin: 'center center'
        }}
      />

      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Static Main Content */}
      <div className="relative z-20 w-screen h-screen flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-block mb-6">
              <Sparkles className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-2xl" />
            </div>
            
            <h1 className="text-7xl font-bold text-white mb-6 drop-shadow-2xl">
              Rift Rewind 2025
            </h1>
            
            <p className="text-2xl text-blue-200 mb-8 drop-shadow-lg">
              Your League of Legends year in review with AI-powered insights
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-black/40 backdrop-blur-lg rounded-3xl p-10 mb-8 border border-white/20 shadow-2xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (gameName && tagLine) {
              handleSubmit(gameName, tagLine);
            }
          }} className="space-y-6">
            
            {/* Make inputs horizontally aligned on sm+ screens, stacked on xs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-white text-sm font-semibold mb-2 text-left">
                  Game Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your game name"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full px-6 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2 text-left">
                  Tag Line
                </label>
                <input
                  type="text"
                  placeholder="Enter your tag (e.g., NA1)"
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  className="w-full px-6 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm text-lg"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="text-red-300 text-sm bg-red-900/30 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !gameName || !tagLine}
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-700/90 hover:to-pink-700/90 disabled:from-gray-600/50 disabled:to-gray-700/50 text-white rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl border border-white/20 backdrop-blur-sm transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing Summoner...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Enter the Rift
                </>
              )}
            </button>
          </form>
        </div>

          {/* Footer Info */}
          <div className="text-white/70 text-sm space-y-2">
            <p className="drop-shadow-lg">✨ Powered by Riot Games API • 🔒 Your data stays private</p>
            <p className="drop-shadow-lg">🎭 Choose from 5 AI narrators • 📊 10 unique insight scenes</p>
          </div>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}