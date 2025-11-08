'use client';

interface ChampionCardProps {
  championName: string;
  championImageUrl: string;
  title: string;
  subtitle?: string;
  stats: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  items?: number[];
  summonerSpells?: {
    spell1Id: number;
    spell2Id: number;
  };
  backgroundGradient: string;
  borderColor: string;
  showPosition?: boolean;
  topChampions?: Array<{
    championName: string;
    games: number;
  }>;
}

export default function ChampionCard({
  championName,
  championImageUrl,
  title,
  subtitle,
  stats,
  items,
  summonerSpells,
  backgroundGradient,
  borderColor,
  showPosition = false,
  topChampions,
}: ChampionCardProps) {
  const getSummonerSpellName = (spellId: number) => {
    const spellMap: { [key: number]: string } = {
      21: "Barrier",
      1: "Boost",
      14: "Dot",
      3: "Exhaust",
      4: "Flash",
      6: "Haste",
      7: "Heal",
      13: "Mana",
      30: "PoroRecall",
      31: "PoroThrow",
      11: "Smite",
      39: "SnowURFSnowball_Mark",
      32: "Snowball",
      12: "Teleport",
    };
    return spellMap[spellId] || "Flash";
  };

  if (showPosition && topChampions) {
    return (
      <div className={`bg-linear-to-br ${backgroundGradient} border ${borderColor} rounded-xl p-6 w-full`}>
        <div className="flex gap-8 items-center">
          {/* Top 3 Champions - Left */}
          <div className="shrink-0 flex flex-col gap-3">
            {topChampions.slice(0, 3).map((champ, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/champion/${champ.championName}.png`}
                  alt={champ.championName || "Champion"}
                  className={`rounded-lg border-2 shadow-lg transition-all ${
                    idx === 0
                      ? "w-32 h-32 border-yellow-500/70"
                      : idx === 1
                      ? "w-28 h-28 border-gray-400/70"
                      : "w-24 h-24 border-orange-600/70"
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-black/80 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white border-2 border-indigo-500">
                  {champ.games}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Column - Right */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h3 className="text-3xl font-bold text-white font-friz">
                {championName}
              </h3>
              <p className="text-sm text-gray-400 mt-1 font-friz">
                {title}
              </p>
            </div>

            {stats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                <span className="text-sm text-gray-300 font-friz">
                  {stat.label}
                </span>
                <span className={`text-2xl font-bold font-friz`} style={{ color: stat.color || '#fff' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-linear-to-br ${backgroundGradient} border ${borderColor} rounded-xl p-6 w-full`}>
      <div className="flex gap-8 items-center">
        {/* Champion Loading Screen Image - Left */}
        <div className="shrink-0">
          <img
            src={championImageUrl}
            alt={championName || "Champion"}
            className="w-64 h-auto rounded-lg border-2 shadow-2xl"
            style={{ borderColor: borderColor.replace('border-', '') }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
            }}
          />
        </div>

        {/* Stats Column - Right */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h3 className="text-3xl font-bold text-white font-friz">
              {championName}
            </h3>
            <p className="text-sm text-gray-400 mt-1 font-friz">
              {title}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1 font-friz">
                {subtitle}
              </p>
            )}
          </div>

          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
              <span className="text-sm text-gray-300 font-friz">
                {stat.label}
              </span>
              <span className={`text-2xl font-bold font-friz`} style={{ color: stat.color || '#fff' }}>
                {stat.value}
              </span>
            </div>
          ))}

          {/* Items Build */}
          {items && items.length > 0 && (
            <div className="bg-black/30 rounded-lg px-6 py-4">
              <p className="text-sm text-gray-300 mb-3 font-friz">
                Items
              </p>
              <div className="flex flex-wrap gap-2">
                {items
                  .filter((item) => item !== 0)
                  .map((itemId, idx) => (
                    <img
                      key={idx}
                      src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                      alt={`Item ${itemId}`}
                      className="w-10 h-10 rounded border border-gray-600"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Summoner Spells */}
          {summonerSpells && (
            <div className="bg-black/30 rounded-lg px-6 py-4">
              <p className="text-sm text-gray-300 mb-3 font-friz">
                Summoner Spells
              </p>
              <div className="flex gap-2">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${getSummonerSpellName(summonerSpells.spell1Id)}.png`}
                  alt="Summoner Spell 1"
                  className="w-10 h-10 rounded border border-gray-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${getSummonerSpellName(summonerSpells.spell2Id)}.png`}
                  alt="Summoner Spell 2"
                  className="w-10 h-10 rounded border border-gray-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
