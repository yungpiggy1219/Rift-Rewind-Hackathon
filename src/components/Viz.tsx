'use client';

import { VizKind } from '@/src/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface VizProps {
  kind: VizKind;
  data: any;
}

export default function Viz({ kind, data }: VizProps) {
  switch (kind) {
    case 'line':
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series?.[0]?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              {data.series?.map((series: any, index: number) => (
                <Line 
                  key={series.name}
                  type="monotone" 
                  dataKey="value" 
                  stroke={series.color || '#3B82F6'}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar':
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.categories?.map((cat: string, i: number) => ({
              category: cat,
              score: data.scores?.[i] || 0,
              benchmark: data.benchmarks?.[i] || 0
            })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="category" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="score" fill="#3B82F6" />
              <Bar dataKey="benchmark" fill="#6B7280" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'radar':
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.categories?.map((cat: string, i: number) => ({
              category: cat,
              value: data.values?.[i] || 0
            })) || []}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, data.maxValue || 100]} 
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
              />
              <Radar 
                dataKey="value" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'heatmap':
      return (
        <div className="grid grid-cols-4 gap-2 p-4">
          {data.months?.map((month: any) => (
            <div 
              key={month.month}
              className="bg-gray-700 rounded-lg p-3 text-center"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${month.intensity || 0.1})`
              }}
            >
              <div className="text-xs text-gray-300">{month.month}</div>
              <div className="text-lg font-bold text-white">{month.matches}</div>
              <div className="text-xs text-gray-400">{month.hours}h</div>
            </div>
          )) || (
            <div className="col-span-4 text-center text-gray-400">
              No heatmap data available
            </div>
          )}
        </div>
      );

    case 'highlight':
      return (
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {data.peakGame?.kda || data.percentile || 'N/A'}
            </div>
            <div className="text-yellow-200">
              {data.peakGame ? `${data.peakGame.kills}/${data.peakGame.deaths}/${data.peakGame.assists} KDA` : 'Peak Performance'}
            </div>
            {data.peakGame?.date && (
              <div className="text-sm text-yellow-300 mt-2">
                {new Date(data.peakGame.date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      );

    case 'badge':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.allies?.map((ally: any, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="font-bold text-white">{ally.name}</div>
              <div className="text-sm text-gray-400">{ally.role}</div>
              <div className="text-lg text-green-400">{ally.winRate}%</div>
              <div className="text-xs text-gray-500">{ally.games} games</div>
            </div>
          )) || (
            <div className="col-span-3 text-center text-gray-400">
              No ally data available
            </div>
          )}
        </div>
      );

    case 'infographic':
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {data.stats && Object.entries(data.stats).map(([key, value]) => (
            <div key={key} className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{value as string}</div>
              <div className="text-sm text-gray-300 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      );

    case 'goal':
      return (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Progress to {data.targetRank}</span>
              <span className="text-blue-400 font-bold">{data.progress}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
          
          {data.keyAreas?.map((area: any, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">{area.area}</span>
                <span className="text-sm text-gray-400">
                  {area.current}/{area.target}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                <div 
                  className={`h-1 rounded-full ${
                    area.priority === 'high' ? 'bg-red-500' : 
                    area.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(area.current / area.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">Visualization not implemented for {kind}</p>
        </div>
      );
  }
}