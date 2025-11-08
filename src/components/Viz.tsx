'use client';

import { VizKind } from '@/src/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, PieChart, Pie } from 'recharts';

interface VizProps {
  kind: VizKind;
  data: any;
}

export default function Viz({ kind, data }: VizProps) {
  switch (kind) {
    case 'line':
      if (!data || (!data.series && !data.chartData)) {
        return (
          <div className="h-64 w-full flex items-center justify-center bg-gray-800 rounded-lg">
            <div className="text-center text-gray-400">
              <div className="text-lg font-semibold mb-2">No Data Available</div>
              <div className="text-sm">Trend analysis requires multiple matches</div>
            </div>
          </div>
        );
      }

      if (!data.series || data.series.length === 0) {
        // Check for alternative data format (gold_share chartData)
        if (!data.chartData || data.chartData.length === 0) {
          return (
            <div className="h-64 w-full flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-center text-gray-400">
                <div className="text-lg font-semibold mb-2">No Data Available</div>
                <div className="text-sm">Trend analysis requires multiple matches</div>
              </div>
            </div>
          );
        }
      }
      
      // Handle multiple series by merging data points
      let lineChartData;
      
      if (data.chartData) {
        // Single series format (gold_share)
        lineChartData = data.chartData;
      } else if (data.series && data.series.length > 0) {
        // Multiple series format - merge all series by month
        const dataByMonth = new Map<number, any>();
        
        data.series.forEach((series: any) => {
          series.data.forEach((point: any) => {
            if (!dataByMonth.has(point.month)) {
              dataByMonth.set(point.month, { month: point.month });
            }
            dataByMonth.get(point.month)[series.name] = point.value;
          });
        });
        
        lineChartData = Array.from(dataByMonth.values()).sort((a, b) => a.month - b.month);
      } else {
        lineChartData = [];
      }
      
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  return monthNames[value - 1] || value;
                }}
                label={{ value: 'Month', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              />
              {/* Left Y-axis for primary metric */}
              <YAxis 
                yAxisId="left"
                stroke={data.type === 'cs_statistics' ? '#10B981' : '#EF4444'}
                label={{ 
                  value: data.type === 'cs_statistics' ? 'CS Per Minute' : 'Damage to Champions', 
                  angle: -90,
                  offset: -1,
                  dy: 30,
                  position: 'insideLeft', 
                  fill: data.type === 'cs_statistics' ? '#10B981' : '#EF4444', 
                  fontSize: 11 
                }}
              />
              {/* Right Y-axis for GPM */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                label={{ value: 'Gold Per Minute', angle: 90, position: 'insideRight', fill: '#F59E0B', fontSize: 11 }}
              />
              {/* Hidden Y-axis for Win Rate (0-100%) - uses full height */}
              <YAxis 
                yAxisId="winRate"
                orientation="right"
                domain={[0, 100]}
                hide={true}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => {
                  const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  return monthNames[value - 1] || value;
                }}
                formatter={(value: number, name: string) => {
                  if (data.type === 'gold_statistics') {
                    return [`${value} GPM`, 'Gold Per Minute'];
                  }
                  if (data.type === 'cs_statistics') {
                    return [`${value} CS/min`, 'CS Per Minute'];
                  }
                  if (name === 'Win Rate %') {
                    return [`${value}%`, name];
                  }
                  if (name === 'Damage to Champions') {
                    return [value.toLocaleString(), name];
                  }
                  if (name === 'Gold Per Minute') {
                    return [`${value} GPM`, name];
                  }
                  return [value.toLocaleString(), name];
                }}
              />
              <Legend 
                verticalAlign="top"
                height={36}
                iconType="line"
                wrapperStyle={{
                  paddingBottom: '10px'
                }}
              />
              {data.chartData ? (
                <Line 
                  type="monotone" 
                  dataKey={data.type === 'cs_statistics' ? 'csPerMinute' : 'goldPerMinute'}
                  stroke={data.type === 'cs_statistics' ? '#10B981' : '#F59E0B'}
                  strokeWidth={2}
                  dot={{ fill: data.type === 'cs_statistics' ? '#10B981' : '#F59E0B' }}
                  yAxisId="left"
                  name={data.type === 'cs_statistics' ? 'CS Per Minute' : 'Gold Per Minute'}
                />
              ) : (
                data.series?.map((series: any) => {
                  // Damage uses left axis, GPM uses right axis, Win Rate uses hidden winRate axis (0-100)
                  let axisId = 'left';
                  if (series.name === 'Gold Per Minute') {
                    axisId = 'right';
                  } else if (series.name === 'Win Rate %') {
                    axisId = 'winRate';
                  }
                  return (
                    <Line 
                      key={series.name}
                      type="monotone" 
                      dataKey={series.name}
                      stroke={series.color || '#3B82F6'}
                      strokeWidth={2}
                      dot={{ fill: series.color || '#3B82F6', r: 3 }}
                      yAxisId={axisId}
                    />
                  );
                })
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar':
      // Handle different bar chart data formats
      let barChartData;
      
      if ((data as any)?.type === 'weakness_stats' && (data as any)?.bars) {
        // Weakness stats format with bars array containing label, value, color
        barChartData = (data as any).bars.map((bar: any) => ({
          category: bar.label,
          value: bar.value
        }));
      } else if ((data as any)?.type === 'killing_spree_stats' && (data as any)?.bars) {
        // Killing spree stats format with bars array
        barChartData = (data as any).bars.map((bar: any) => ({
          category: bar.label,
          value: bar.value
        }));
      } else if ((data as any)?.type === 'damage_statistics' || (data as any)?.type === 'damage_taken_statistics' || (data as any)?.type === 'healing_statistics' || (data as any)?.type === 'vision_statistics') {
        // New damage/healing/vision stats format with categories and values arrays
        barChartData = (data as any)?.categories?.map((cat: string, i: number) => ({
          category: cat,
          value: (data as any)?.values?.[i] || 0
        })) || [];
      } else {
        // Legacy format with scores and benchmarks
        barChartData = (data as any)?.categories?.map((cat: string, i: number) => ({
          category: cat,
          score: (data as any)?.scores?.[i] || 0,
          benchmark: (data as any)?.benchmarks?.[i] || 0
        })) || [];
      }
      
      return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="category" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toLocaleString();
                }}
              />
              {barChartData[0]?.value !== undefined ? (
                <Bar dataKey="value">
                  {barChartData.map((entry: any, index: number) => {
                    // Get color from bars array if weakness_stats or killing_spree_stats type
                    const barColor = (data.type === 'weakness_stats' || data.type === 'killing_spree_stats') && data.bars?.[index]?.color 
                      ? data.bars[index].color 
                      : data.colors?.[index] || "#3B82F6";
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={barColor} 
                      />
                    );
                  })}
                </Bar>
              ) : (
                <>
                  <Bar dataKey="score" fill="#3B82F6" />
                  <Bar dataKey="benchmark" fill="#6B7280" opacity={0.5} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'radar':
      if (!data || !data.values || data.values.length === 0) {
        return (
          <div className="h-64 w-full flex items-center justify-center bg-gray-800 rounded-lg">
            <div className="text-center text-gray-400">
              <div className="text-lg font-semibold mb-2">No Playstyle Data</div>
              <div className="text-sm">Requires match history to analyze playstyle patterns</div>
            </div>
          </div>
        );
      }
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
          {(data as any)?.months?.length > 0 ? (data as any).months.map((month: any) => {
            const hours = month.hours ?? 0; // Use 0 if null/undefined
            const matches = month.matches ?? 0;
            return (
              <div 
                key={month.month}
                className="bg-gray-700 rounded-lg p-3 text-center"
                style={{
                  backgroundColor: `rgba(83, 97, 123, ${month.intensity || 0.1})`
                }}
              >
                <div className="text-xs text-gray-300 font-friz">{month.month}</div>
                <div className="text-lg font-bold text-white font-friz">{matches}</div>
                <div className="text-xs text-gray-400 font-friz">{hours} hours</div>
              </div>
            );
          }) : (
            <div className="col-span-4 text-center text-gray-400 py-8">
              <div className="text-lg font-semibold mb-2 font-friz">No Data Available</div>
              <div className="text-sm font-friz">Activity data requires match history access</div>
            </div>
          )}
        </div>
      );

    case 'highlight':
      if (!data || !data.peakGame) {
        return (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <div className="text-center text-gray-400">
              <div className="text-3xl font-bold mb-2">N/A</div>
              <div className="text-lg mb-2">No Peak Performance Data</div>
              <div className="text-sm">Requires match history to identify best games</div>
            </div>
          </div>
        );
      }
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
      // Handle both old allies format and new badge format
      if (!data) {
        return (
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg font-semibold mb-2">No Data Available</div>
            <div className="text-sm">Unable to load information</div>
          </div>
        );
      }

      // New badge format (for best_friend scene)
      if (data.type === 'badge' && data.title) {
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-8 border-2 border-purple-500/50 backdrop-blur-sm max-w-md w-full">
              <div className="text-center">
                <div className="text-6xl mb-4">{data.icon || '👥'}</div>
                <div className="text-3xl font-bold text-white mb-2">{data.title}</div>
                <div className="text-lg text-purple-300 mb-6">{data.subtitle}</div>
                
                {data.stats && data.stats.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {data.stats.map((stat: any, index: number) => (
                      <div key={index} className="bg-black/30 rounded-lg p-3">
                        <div className="text-2xl font-bold" style={{ color: stat.color || '#fff' }}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {data.recentGames && data.recentGames.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-purple-500/30">
                    <div className="text-sm text-gray-300 mb-3">Recent Games Together</div>
                    <div className="space-y-2">
                      {data.recentGames.slice(0, 3).map((game: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-xs bg-black/20 rounded px-3 py-2">
                          <span className="text-gray-400">{game.championName}</span>
                          <span className={game.won ? 'text-green-400' : 'text-red-400'}>
                            {game.won ? 'Victory' : 'Defeat'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Old allies format (backward compatibility)
      if (!data.allies || data.allies.length === 0) {
        return (
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg font-semibold mb-2">No Ally Data</div>
            <div className="text-sm">Play duo queue games to track ally synergy</div>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.allies.map((ally: any, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="font-bold text-white">{ally.name}</div>
              <div className="text-sm text-gray-400">{ally.role}</div>
              <div className="text-lg text-green-400">{ally.winRate}%</div>
              <div className="text-xs text-gray-500">{ally.games} games</div>
            </div>
          ))}
        </div>
      );

    case 'infographic':
      if (!data || !data.stats || Object.keys(data.stats).length === 0) {
        return (
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg font-semibold mb-2">No ARAM Data</div>
            <div className="text-sm">Play ARAM games to see fun mode statistics</div>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {Object.entries(data.stats).map(([key, value]) => (
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
      if (!data || !data.keyAreas || data.keyAreas.length === 0 || data.currentRank === "N/A") {
        return (
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg font-semibold mb-2">No Improvement Path</div>
            <div className="text-sm">Play ranked games to get personalized improvement recommendations</div>
          </div>
        );
      }
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
          
          {data.keyAreas.map((area: any, index: number) => (
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

    case 'ranked':
      if (!data || (!data.soloQueue && !data.flexQueue)) {
        return (
          <div className="text-center text-gray-400 py-8">
            <div className="text-lg font-semibold mb-2">No Ranked Data</div>
            <div className="text-sm">Play ranked games to see your competitive stats</div>
          </div>
        );
      }

      // Helper function to render a ranked card
      const renderRankedCard = (queueData: any, queueType: string) => {
        if (!queueData) {
          // Show unranked card
          return (
            <div className="bg-linear-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-gray-700 shadow-2xl">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2 font-friz">{queueType}</h2>
              </div>
              
              <div className="flex flex-col items-center justify-center py-4">
                <img 
                  src="/images/ranked/unranked.png"
                  alt="Unranked"
                  className="w-24 h-24 object-contain mb-4"
                />
                <div className="text-2xl font-bold text-gray-400 font-friz">Unranked</div>
                <div className="text-sm text-gray-500 mt-2 font-friz">Play placements</div>
              </div>
            </div>
          );
        }

        const rankImageName = (queueData.tier || 'unranked').toLowerCase();
        const rankImagePath = `/images/ranked/${rankImageName}.png`;
        
        return (
          <div className="bg-linear-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-gray-700 shadow-2xl">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-2 font-friz">{queueType}</h2>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              {/* Rank Image */}
              <div className="shrink-0">
                <img 
                  src={rankImagePath}
                  alt={`${queueData.tier} ${queueData.rankDivision}`}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/ranked/unranked.png';
                  }}
                />
              </div>
              
              {/* Rank Info */}
              <div className="flex-1 ml-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1 font-friz">
                    {queueData.tier.charAt(0).toUpperCase() + queueData.tier.slice(1).toLowerCase()} {queueData.rankDivision}
                  </div>
                  <div className="text-xl text-cyan-400 font-semibold font-friz">
                    {queueData.lp} LP
                  </div>
                </div>
              </div>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="mb-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${queueData.winRate}%` }}
                />
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 font-friz">
                  {queueData.winRate}%
                </div>
                <div className="text-xs text-gray-400 mt-1 font-friz">WR</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white font-friz">
                  {queueData.wins}W - {queueData.losses}L
                </div>
                <div className="text-xs text-gray-400 mt-1 font-friz">{queueData.totalGames} Games</div>
              </div>
            </div>
          </div>
        );
      };
      
      return (
        <div className="flex items-center justify-center p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
            {renderRankedCard(data.soloQueue, 'Ranked Solo')}
            {renderRankedCard(data.flexQueue, 'Ranked Flex')}
          </div>
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