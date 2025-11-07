'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';

export default function GlobalMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(true); // Default to ON
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Create audio element
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/bgm.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3; // Set to 30% volume for background music
      
      // Try to auto-play
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Music started playing automatically');
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log('Autoplay prevented by browser:', error);
            // Browser prevented autoplay - wait for user interaction
            setIsPlaying(false);
            
            // Add one-time click listener to start music
            const handleFirstClick = () => {
              if (audioRef.current && !hasInteracted) {
                audioRef.current.play().then(() => {
                  console.log('Music started after user interaction');
                  setIsPlaying(true);
                  setHasInteracted(true);
                });
              }
            };
            
            document.addEventListener('click', handleFirstClick, { once: true });
          });
      }
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [hasInteracted]);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
      setIsPlaying(true);
    }
  };

  return (
    <button
      onClick={toggleMusic}
      className="fixed top-4 right-4 z-50 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-200 hover:scale-110"
      aria-label={isPlaying ? 'Mute music' : 'Play music'}
      title={isPlaying ? 'Mute music' : 'Play music'}
    >
      <div className="relative">
        <Headphones className={`w-6 h-6 ${isPlaying ? 'text-white' : 'text-gray-400'}`} />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-0.5 bg-gray-400 rotate-45 rounded-full" />
          </div>
        )}
      </div>
    </button>
  );
}
