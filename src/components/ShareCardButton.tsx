'use client';

import { useState } from 'react';
import { Share2, Download, X } from 'lucide-react';
import { SceneId } from '@/src/lib/types';

interface ShareCardButtonProps {
  sceneId: SceneId;
  playerName?: string;
  sceneData?: any;
}

export default function ShareCardButton({ sceneId, playerName, sceneData }: ShareCardButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateShareImage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/share/${sceneId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          sceneData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate share image');
      }

      const data = await response.json();
      setImageUrl(data.url);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error generating share image:', error);
      alert('Failed to generate share image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `rift-rewind-${sceneId}-${playerName || 'player'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!imageUrl) return;
    
    try {
      // For data URLs, we can't directly copy to clipboard
      // In a real implementation, you'd upload to a CDN and copy that URL
      await navigator.clipboard.writeText(window.location.href);
      alert('Page URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <>
      <button
        onClick={generateShareImage}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
      >
        <Share2 className="w-4 h-4" />
        {isLoading ? 'Generating...' : 'Share'}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Share Your Scene</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {imageUrl && (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <img 
                      src={imageUrl} 
                      alt={`${sceneId} share card`}
                      className="w-full h-auto rounded"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={downloadImage}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    Share your League of Legends year in review with friends!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}