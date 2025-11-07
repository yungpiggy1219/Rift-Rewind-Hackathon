'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ProgressiveTextProps {
  segments: string[]; // Array of text segments to display progressively
  typingSpeed?: number;
  className?: string;
  onComplete?: () => void;
}

export default function ProgressiveText({ 
  segments,
  typingSpeed = 40,
  className = '',
  onComplete
}: ProgressiveTextProps) {
  const [displayedSegments, setDisplayedSegments] = useState<string[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);
  const completedRef = useRef(false);

  const currentSegment = segments[currentSegmentIndex] || '';
  const hasMoreSegments = currentSegmentIndex < segments.length - 1;
  const isComplete = currentSegmentIndex === segments.length - 1 && !isTyping;

  // Typewriter effect for current segment
  useEffect(() => {
    if (!isTyping || !currentSegment) return;

    const currentIdx = indexRef.current;

    if (currentIdx < currentSegment.length) {
      const timeout = setTimeout(() => {
        setCurrentText(currentSegment.slice(0, currentIdx + 1));
        indexRef.current = currentIdx + 1;
      }, typingSpeed);

      return () => clearTimeout(timeout);
    } else if (currentIdx === currentSegment.length && isTyping) {
      // Current segment complete - use timeout to avoid cascading
      const timeout = setTimeout(() => {
        setIsTyping(false);
        
        if (!hasMoreSegments && !completedRef.current) {
          // All segments complete
          completedRef.current = true;
          onComplete?.();
        }
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [currentText, isTyping, typingSpeed, currentSegment, hasMoreSegments, onComplete]);

  // Handle click to advance
  const handleClick = () => {
    if (isTyping && currentSegment) {
      // Skip current typing animation
      indexRef.current = currentSegment.length;
      setCurrentText(currentSegment);
      setIsTyping(false);
      
      if (!hasMoreSegments) {
        onComplete?.();
      }
    } else if (hasMoreSegments) {
      // Add current segment to displayed and move to next
      setDisplayedSegments(prev => [...prev, currentSegment]);
      setCurrentSegmentIndex(prev => prev + 1);
      setCurrentText('');
      setIsTyping(true);
      indexRef.current = 0;
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`cursor-pointer ${className}`}
    >
      {/* Previously completed segments */}
      {displayedSegments.map((segment, index) => (
        <p key={index} className="text-white text-xl font-medium mb-3 leading-relaxed">
          {segment}
        </p>
      ))}
      
      {/* Currently typing segment */}
      {currentText && (
        <p className="text-white text-xl font-medium mb-3 leading-relaxed">
          {currentText}
          {isTyping && (
            <span className="inline-block w-1 h-5 bg-white ml-1 animate-pulse"></span>
          )}
        </p>
      )}

      {/* Click indicators */}
      {!isComplete && (
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-400 animate-pulse">
            {isTyping ? 'Click to skip' : 'Click to continue...'}
          </span>
        </div>
      )}
    </div>
  );
}
