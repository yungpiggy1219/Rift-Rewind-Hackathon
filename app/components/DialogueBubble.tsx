'use client';

import { useState, useEffect, useRef } from 'react';

interface DialogueBubbleProps {
  text: string | string[]; // Can be a single string or array of strings
  isActive?: boolean;
  typingSpeed?: number; // milliseconds per character
  className?: string;
  onComplete?: () => void;
  onAdvance?: () => void; // Called when user clicks to see next message
}

export default function DialogueBubble({ 
  text, 
  isActive = true, 
  typingSpeed = 30,
  className = '',
  onComplete,
  onAdvance
}: DialogueBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const indexRef = useRef(0);
  
  // Convert text to array for consistent handling, filter out empty strings
  // Fallback: Handle empty, null, or undefined text with safe defaults
  const messages = text 
    ? (Array.isArray(text) ? text : [text]).filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0)
    : [];
  
  // Ensure currentMessageIndex is within bounds
  const safeMessageIndex = Math.max(0, Math.min(currentMessageIndex, messages.length - 1));
  const currentMessage = messages[safeMessageIndex] || '';
  const hasMoreMessages = messages.length > 0 && safeMessageIndex < messages.length - 1;

  // Reset when message changes
  useEffect(() => {
    if (!currentMessage || messages.length === 0) return;
    
    try {
      indexRef.current = 0;
      setDisplayedText('');
      setIsTyping(true);
    } catch (error) {
      console.error('[DialogueBubble] Error resetting message:', error);
    }
  }, [currentMessage, currentMessageIndex, messages.length]);

  // Typewriter effect
  useEffect(() => {
    if (!isActive || !isTyping || !currentMessage || messages.length === 0) return;

    const currentIdx = indexRef.current;

    try {
      if (currentIdx < currentMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, currentIdx + 1));
          indexRef.current = currentIdx + 1;
        }, typingSpeed);

        return () => clearTimeout(timeout);
      } else if (currentIdx === currentMessage.length && isTyping) {
        setIsTyping(false);
        if (!hasMoreMessages) {
          onComplete?.();
        }
      }
    } catch (error) {
      console.error('[DialogueBubble] Error in typewriter effect:', error);
      // Fallback: show full message immediately
      setDisplayedText(currentMessage);
      setIsTyping(false);
    }
  }, [displayedText, isActive, isTyping, typingSpeed, currentMessage, hasMoreMessages, onComplete, messages.length]);

  // Handle click to advance to next message
  const handleAdvance = () => {
    try {
      if (isTyping && currentMessage) {
        // Skip current typing animation
        indexRef.current = currentMessage.length;
        setDisplayedText(currentMessage);
        setIsTyping(false);
        // Check if this was the last message and trigger onComplete
        if (!hasMoreMessages) {
          onComplete?.();
        }
      } else if (hasMoreMessages) {
        // Move to next message
        setCurrentMessageIndex(prev => Math.min(prev + 1, messages.length - 1));
        onAdvance?.();
      }
    } catch (error) {
      console.error('[DialogueBubble] Error advancing message:', error);
    }
  };

  // Early return: Don't render if no valid messages
  if (!text || messages.length === 0 || !currentMessage) {
    return null;
  }

  // Fallback display text if something goes wrong
  const safeDisplayText = displayedText || currentMessage || 'Loading...';

  return (
    <div 
      onClick={handleAdvance}
      className={`bg-purple-600/95 backdrop-blur-sm text-white text-sm px-8 py-6 rounded-m border border-purple-400/50 font-medium shadow-2xl max-w-s relative cursor-pointer hover:bg-purple-500/95 transition-colors ${className}`}
      style={{
        animation: isTyping ? 'none' : 'subtle-float 3s ease-in-out infinite'
      }}
    >
      {/* Speech bubble tail */}
      <div className="absolute -bottom-2 left-8 w-4 h-4 bg-purple-600/95 border-b border-r border-purple-400/50 transform rotate-45"></div>
      
      {/* Text content with fallback */}
      <p className="relative z-10 leading-relaxed font-friz text-base">
        {safeDisplayText}
        {isTyping && (
          <span className="inline-block w-1 h-4 bg-white ml-1 animate-pulse"></span>
        )}
      </p>

      {/* Click to skip indicator (only show while typing) */}
      {isTyping && (
        <div className="absolute -bottom-8 left-0 right-0 text-center">
          <span className="text-xs text-purple-300/80">
            Click to skip
          </span>
        </div>
      )}
      
      {/* Triangle indicator for more messages */}
      {!isTyping && hasMoreMessages && (
        <div className="absolute bottom-2 right-2 z-20">
          <svg 
            className="w-3 h-3 text-white animate-bounce" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M10 15l-5-5h10l-5 5z"/>
          </svg>
        </div>
      )}
    </div>
  );
}
