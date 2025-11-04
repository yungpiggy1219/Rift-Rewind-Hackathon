'use client';

import { useState } from 'react';
import StatsCard from '@/components/StatsCard';
import PerformanceCharts from '@/components/PerformanceCharts';
import { PlayerStats, InsightsResponse } from '@/lib/types';

export default function Home() {
  const [summonerName, setSummonerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ stats: PlayerStats; aiRecap: string } | null>(null);

  const fetchInsights = async () => {
    if (!summonerName.trim()) {
      setError('Please enter a summoner name');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch(`/api/insights?summonerName=${encodeURIComponent(summonerName)}&matchCount=20`);
      const result: InsightsResponse = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch insights');
      } else if (result.stats && result.aiRecap) {
        setData({ stats: result.stats, aiRecap: result.aiRecap });
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInsights();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Rift Rewind
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Analyze your League of Legends performance with AI-powered insights
          </p>
        </header>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={summonerName}
              onChange={(e) => setSummonerName(e.target.value)}
              placeholder="Enter Summoner Name (e.g., Faker)"
              className="flex-1 px-6 py-4 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Analyze'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* AI Recap */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">AI Performance Recap</h2>
              <p className="text-lg leading-relaxed">{data.aiRecap}</p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Win Rate"
                value={`${data.stats.winRate}%`}
                subtitle={`${data.stats.wins}W - ${data.stats.losses}L`}
              />
              <StatsCard
                title="KDA Ratio"
                value={data.stats.avgKDA}
                subtitle={`${data.stats.avgKills} / ${data.stats.avgDeaths} / ${data.stats.avgAssists}`}
              />
              <StatsCard
                title="Damage per Minute"
                value={data.stats.avgDPM}
                subtitle="Average DPM"
              />
              <StatsCard
                title="Vision Score"
                value={data.stats.avgVisionScore}
                subtitle={`${data.stats.avgWardsPlaced} wards/game`}
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Games"
                value={data.stats.totalGames}
                subtitle="Analyzed"
              />
              <StatsCard
                title="Gold per Minute"
                value={data.stats.avgGoldPerMinute}
                subtitle="Average GPM"
              />
              <StatsCard
                title="Recent Form"
                value={data.stats.recentForm.filter(w => w).length}
                subtitle={`Wins in last ${data.stats.recentForm.length} games`}
              />
            </div>

            {/* Charts */}
            <PerformanceCharts stats={data.stats} />

            {/* Champion Stats Table */}
            {data.stats.championStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Champion Statistics
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300">Champion</th>
                        <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">Games</th>
                        <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">Wins</th>
                        <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">Win Rate</th>
                        <th className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">KDA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stats.championStats.map((champ, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            {champ.championName}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
                            {champ.games}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
                            {champ.wins}
                          </td>
                          <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
                            {champ.winRate.toFixed(1)}%
                          </td>
                          <td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
                            {champ.avgKDA.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions when no data */}
        {!data && !loading && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              How to Use Rift Rewind
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Enter your League of Legends summoner name in the search box above</li>
              <li>Click &quot;Analyze&quot; to fetch your recent match history</li>
              <li>View comprehensive statistics including KDA, damage, vision, and more</li>
              <li>Get AI-powered insights about your performance and areas for improvement</li>
              <li>Explore interactive charts showing your performance trends</li>
            </ol>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Make sure your Riot API credentials are properly configured
                in the environment variables for the app to work.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
