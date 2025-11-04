'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PlayerStats } from '@/lib/types';

interface PerformanceChartsProps {
  stats: PlayerStats;
}

export default function PerformanceCharts({ stats }: PerformanceChartsProps) {
  // Champion performance data
  const championData = stats.championStats.map((champ) => ({
    name: champ.championName,
    games: champ.games,
    winRate: champ.winRate,
    kda: champ.avgKDA,
  }));

  // Recent form data
  const recentFormData = stats.recentForm.map((win, index) => ({
    game: `G${stats.recentForm.length - index}`,
    result: win ? 1 : 0,
  }));

  // Win/Loss pie chart data
  const winLossData = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
  ];

  // KDA breakdown
  const kdaData = [
    { name: 'Kills', value: stats.avgKills },
    { name: 'Deaths', value: stats.avgDeaths },
    { name: 'Assists', value: stats.avgAssists },
  ];

  return (
    <div className="space-y-8">
      {/* Champion Performance */}
      {championData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Top Champions Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={championData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="games" fill="#3b82f6" name="Games Played" />
              <Bar yAxisId="right" dataKey="winRate" fill="#10b981" name="Win Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Form */}
        {recentFormData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Form
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={recentFormData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="game" />
                <YAxis domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip
                  formatter={(value: number) => (value === 1 ? 'Win' : 'Loss')}
                />
                <Line
                  type="monotone"
                  dataKey="result"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Win/Loss Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Win/Loss Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={winLossData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KDA Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          KDA Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={kdaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
