"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AgentId, ScenePayload, NarrationResponse } from "@/src/lib/types";
import { SCENE_ORDER } from "@/src/lib/sceneRegistry";
import DialogueBubble from "../../app/components/DialogueBubble";
import SummonerCard from "../../app/components/SummonerCard";
import Viz from "./Viz";
import ShareCardButton from "./ShareCardButton";
import ProgressiveText from "./ProgressiveText";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface RecapFlowProps {
  puuid: string;
  agentId: AgentId;
  playerName?: string;
}

const fetcher = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  return response.json();
};

// Component to display best friend's profile with stats
function BestFriendProfile({
  puuid,
  stats,
  recentGames,
}: {
  puuid: string;
  stats: any;
  recentGames: any;
}) {
  const { data: profileData, error: profileError } = useSWR(
    `/api/profile/${puuid}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: rankedData } = useSWR(
    puuid ? `/api/ranked/${puuid}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (profileError) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <p className="text-gray-400">Unable to load profile</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
        <p className="text-gray-400 mt-2">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SummonerCard
        profile={profileData}
        playerName={profileData?.name}
        tagLine={profileData?.tagLine}
        rankedInfo={rankedData}
        containerClassName="relative"
        showMenuButton={false}
      />

      {/* Stats Grid Below Card */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {stats?.map((stat: any, index: number) => (
          <div
            key={index}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
          >
            <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
            <p
              className="text-2xl font-bold"
              style={{ color: stat.color || "#fff" }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Games Section */}
      {recentGames && recentGames.length > 0 && (
        <div className="mt-6 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-3">
            Recent Games Together
          </h3>
          <div className="space-y-2">
            {recentGames.map((game: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm bg-black/20 rounded px-3 py-2"
              >
                <span className="text-gray-300">{game.championName}</span>
                <span className="text-gray-500">{game.date}</span>
                <span
                  className={
                    game.won
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                  }
                >
                  {game.won ? "Victory" : "Defeat"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecapFlow({
  puuid,
  agentId,
  playerName,
}: RecapFlowProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [contentComplete, setContentComplete] = useState(false); // Track if main content is complete
  const [showHeatmap, setShowHeatmap] = useState(false); // Track if heatmap should show
  const [dialogueComplete, setDialogueComplete] = useState(false); // Track if Vel'Koz dialogue is complete
  const [particles] = useState(() =>
    Array.from({ length: 15 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    }))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const clickSfxRef = useRef<HTMLAudioElement | null>(null);
  const smiteSfxRef = useRef<HTMLAudioElement | null>(null);
  const baronRecallSfxRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const currentSceneId = SCENE_ORDER[currentSceneIndex];

  // Initialize sound effects
  useEffect(() => {
    if (typeof window !== "undefined") {
      clickSfxRef.current = new Audio("/sfx/pm.mp3");
      smiteSfxRef.current = new Audio("/sfx/smite.mp3");
      baronRecallSfxRef.current = new Audio("/sfx/baron_recall.mp3");
    }
    return () => {
      if (clickSfxRef.current) {
        clickSfxRef.current.pause();
      }
      if (smiteSfxRef.current) {
        smiteSfxRef.current.pause();
      }
      if (baronRecallSfxRef.current) {
        baronRecallSfxRef.current.pause();
      }
    };
  }, []);

  // Function to play dialogue click sound
  const playDialogueClickSound = () => {
    if (clickSfxRef.current) {
      clickSfxRef.current.currentTime = 0; // Reset to start
      clickSfxRef.current.play().catch((error) => {
        console.log("Click sound failed:", error);
      });
    }
  };

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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Fetch scene data - use stable cache key to prevent refetching
  const sceneKey = currentSceneId ? `scene-${currentSceneId}-${puuid}` : null;

  const {
    data: sceneData,
    error: sceneError,
    isLoading: sceneLoading,
  } = useSWR<ScenePayload>(
    sceneKey,
    async () => {
      console.log(
        `[RecapFlow] Fetching scene data: ${currentSceneId} - using cached data only`
      );
      return fetcher(`/api/insights/${currentSceneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid }),
      }) as Promise<ScenePayload>;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  );

  // Fetch narration - use stable cache key based on scene completion
  // Only fetch narration when we have scene data
  const narrationKey =
    sceneData && currentSceneId
      ? `narration-${agentId}-${currentSceneId}-${puuid}-${
          playerName || "unknown"
        }`
      : null;

  const {
    data: narration,
    error: narrationError,
    isLoading: narrationLoading,
  } = useSWR<NarrationResponse>(
    narrationKey,
    async () => {
      console.log("[RecapFlow] Fetching narration:", agentId, currentSceneId);
      return fetcher("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          sceneId: currentSceneId,
          insight: sceneData?.insight,
          playerName: playerName || "unknown",
        }),
      }) as Promise<NarrationResponse>;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  );

  const isLoading = sceneLoading || narrationLoading;
  const error = sceneError || narrationError;

  const goToNext = () => {
    if (currentSceneIndex < SCENE_ORDER.length - 1) {
      // Play smite sound for "Next"
      if (smiteSfxRef.current) {
        smiteSfxRef.current.currentTime = 0;
        smiteSfxRef.current.play().catch((error) => {
          console.log("Smite sound failed:", error);
        });
      }

      setCurrentSceneIndex(currentSceneIndex + 1);
      // Reset state for next scene
      setContentComplete(false);
      setShowHeatmap(false);
      setDialogueComplete(false);
    } else {
      // On last scene, "Back to Menu" button - play baron recall sound
      if (baronRecallSfxRef.current) {
        baronRecallSfxRef.current.currentTime = 0;
        baronRecallSfxRef.current.play().catch((error) => {
          console.log("Baron recall sound failed:", error);
        });
      }

      // Go back after a short delay to let sound play
      setTimeout(() => {
        goBack();
      }, 500);
    }
  };

  const goToPrevious = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
      // Reset state for previous scene
      setContentComplete(false);
      setShowHeatmap(false);
      setDialogueComplete(false);
    }
  };

  const goBack = () => {
    router.push(
      `/menu/${puuid}?name=${encodeURIComponent(playerName || "Summoner")}&tag=`
    );
  };

  // Calculate tilt values based on mouse position
  const tiltX = mousePosition.y * 3; // Subtle tilt up/down
  const tiltY = mousePosition.x * -3; // Subtle tilt left/right

  if (error) {
    return (
      <div
        ref={containerRef}
        className="w-screen h-screen relative overflow-hidden"
      >
        {/* Background Image with Tilt Effect */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: "url(/images/backgrounds/background_3.jpg)",
            backgroundSize: "120%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.1)`,
            transition: "transform 0.15s ease-out",
            transformOrigin: "center center",
          }}
        />

        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black/60 z-10"></div>

        {/* Error Content */}
        <div className="relative z-20 w-screen h-screen flex items-center justify-center">
          <div className="text-center bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-red-400 mb-4">
              Error Loading Scene
            </h2>
            <p className="text-gray-300 mb-6">
              {error.message || "Failed to load scene data"}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={goBack}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden"
    >
      {/* Background Image with Tilt Effect */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: "url(/images/backgrounds/background_3.jpg)",
          backgroundSize: "120%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.1)`,
          transition: "transform 0.15s ease-out",
          transformOrigin: "center center",
        }}
      />

      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex justify-between items-center">
          {/* SummonerCard with Menu - Top Left */}
          <SummonerCard
            playerName={playerName}
            containerClassName="relative"
            showMenuButton={true}
            onBackToMenu={goBack}
          />

          {/* Share Button - Top Right */}
          <div>
            {sceneData && (
              <ShareCardButton
                sceneId={currentSceneId}
                playerName={playerName}
                sceneData={sceneData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Fixed Height Layout */}
      <div className="absolute inset-0 z-20 flex flex-col">
        {/* Top Spacer for Navigation */}
        <div className="h-20 flex-shrink-0"></div>

        {/* Scene Content - Takes remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
          {isLoading ? (
            <div className="text-center bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Loading Scene {currentSceneIndex + 1}
              </h3>
              <p className="text-gray-300 text-sm">
                Analyzing your League journey...
              </p>
            </div>
          ) : sceneData && narration ? (
            <div className="w-full h-full max-w-5xl mx-auto flex items-center justify-center">
              {/* Centered Visualization Panel */}
              <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex flex-col overflow-hidden max-w-3xl w-full max-h-[calc(100vh-200px)]">
                {/* Progressive Content for All Scenes */}
                {currentSceneId === "year_in_motion" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.totalMatches || 0
                          } matches.`,
                          `${
                            sceneData?.insight?.vizData?.totalHours || 0
                          } hours of data collected.`,
                          `${
                            sceneData?.insight?.vizData?.peakMonth || "N/A"
                          } — your peak of activity — demonstrated unrelenting commitment.`,
                          `Fascinating levels of consistency... for a human.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz
                          kind="heatmap"
                          data={sceneData?.insight?.vizData}
                        />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "signature_champion" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.mostPlayed
                              ?.championName || "Unknown"
                          } — ${
                            sceneData?.insight?.vizData?.mostPlayed?.games || 0
                          } matches, ${
                            sceneData?.insight?.vizData?.mostPlayed?.winRate?.toFixed(
                              1
                            ) || 0
                          }% win rate.`,
                          `Your mastery of this champion is... adequate.`,
                          `The data suggests continued focus on this selection.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Champion Loading Screen and Stats - Side by Side */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-6">
                            <div className="flex gap-8 items-center">
                              {/* Champion Loading Screen Image - Left */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                                    sceneData?.insight?.vizData?.mostPlayed
                                      ?.championName || "Aatrox"
                                  }_0.jpg`}
                                  alt={
                                    sceneData?.insight?.vizData?.mostPlayed
                                      ?.championName || "Champion"
                                  }
                                  className="w-64 h-auto rounded-lg border-2 border-blue-500/50 shadow-2xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
                                  }}
                                />
                              </div>

                              {/* Stats Column - Right */}
                              <div className="flex-1 flex flex-col gap-4">
                                <h3 className="text-3xl font-bold text-white mb-2">
                                  {sceneData?.insight?.vizData?.mostPlayed
                                    ?.championName || "Unknown"}
                                </h3>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Win Rate
                                  </span>
                                  <span className="text-2xl font-bold text-cyan-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.winRate || 0}
                                    %
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    KDA
                                  </span>
                                  <span className="text-2xl font-bold text-white">
                                    {sceneData?.insight?.vizData?.stats?.kda ||
                                      "0.00"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Damage/Minute
                                  </span>
                                  <span className="text-2xl font-bold text-orange-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.damagePerMin || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Vision Score
                                  </span>
                                  <span className="text-2xl font-bold text-yellow-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.visionScore || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    CS/Minute
                                  </span>
                                  <span className="text-2xl font-bold text-green-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.csPerMin || "0.0"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "damage_share" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${Math.round(
                            (sceneData?.insight?.vizData
                              ?.totalDamageDealtToChampions || 0) / 1000
                          )}K total damage to champions.`,
                          `Average of ${(
                            sceneData?.insight?.vizData?.avgDamageToChampions ||
                            0
                          ).toLocaleString()} per game.`,
                          `Your best match dealt ${Math.round(
                            (sceneData?.insight?.vizData?.maxDamageMatch
                              ?.damage || 0) / 1000
                          )}K damage with ${
                            sceneData?.insight?.vizData?.maxDamageMatch
                              ?.championName || "Unknown"
                          }.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Champion Card - Highest Damage Game */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-xl p-6">
                            <div className="flex gap-8 items-center">
                              {/* Champion Loading Screen Image - Left */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                                    sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.championName || "Aatrox"
                                  }_0.jpg`}
                                  alt={
                                    sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.championName || "Champion"
                                  }
                                  className="w-64 h-auto rounded-lg border-2 border-red-500/50 shadow-2xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
                                  }}
                                />
                              </div>

                              {/* Stats Column - Right */}
                              <div className="flex-1 flex flex-col gap-4">
                                <div>
                                  <h3 className="text-3xl font-bold text-white">
                                    {sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.championName || "Unknown"}
                                  </h3>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Highest Damage Dealt Game
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Total Damage to Champions
                                  </span>
                                  <span className="text-2xl font-bold text-yellow-400">
                                    {Math.round(
                                      (sceneData?.insight?.vizData?.stats
                                        ?.highestDamage || 0) / 1000
                                    )}
                                    K
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    KDA
                                  </span>
                                  <span className="text-2xl font-bold text-cyan-400">
                                    {sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.kda || "0/0/0"}
                                  </span>
                                </div>

                                {/* Items Build */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Items
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      sceneData?.insight?.vizData
                                        ?.maxDamageMatch?.items || []
                                    )
                                      .filter((item: number) => item !== 0)
                                      .map((itemId: number, idx: number) => (
                                        <img
                                          key={idx}
                                          src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                                          alt={`Item ${itemId}`}
                                          className="w-10 h-10 rounded border border-gray-600"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                          }}
                                        />
                                      ))}
                                  </div>
                                </div>

                                {/* Summoner Spells */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Summoner Spells
                                  </p>
                                  <div className="flex gap-2">
                                    {sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.summoner1Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData
                                            .maxDamageMatch.summoner1Id === 21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner1Id ===
                                              12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 1"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                    {sceneData?.insight?.vizData?.maxDamageMatch
                                      ?.summoner2Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData
                                            .maxDamageMatch.summoner2Id === 21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxDamageMatch.summoner2Id ===
                                              12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 2"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "damage_taken" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${Math.round(
                            (sceneData?.insight?.vizData?.totalDamageTaken ||
                              0) / 1000
                          )}K total damage absorbed.`,
                          `You tanked ${(
                            sceneData?.insight?.vizData?.avgDamageTaken || 0
                          ).toLocaleString()} damage per game on average.`,
                          `Your best match absorbed ${Math.round(
                            (sceneData?.insight?.vizData?.maxDamageTakenMatch
                              ?.damageTaken || 0) / 1000
                          )}K damage taken with ${
                            sceneData?.insight?.vizData?.maxDamageTakenMatch
                              ?.championName || "Unknown"
                          }.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Champion Card - Highest Damage Taken Game */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-xl p-6">
                            <div className="flex gap-8 items-center">
                              {/* Champion Loading Screen Image - Left */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                                    sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.championName ||
                                    "Aatrox"
                                  }_0.jpg`}
                                  alt={
                                    sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.championName ||
                                    "Champion"
                                  }
                                  className="w-64 h-auto rounded-lg border-2 border-purple-500/50 shadow-2xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
                                  }}
                                />
                              </div>

                              {/* Stats Column - Right */}
                              <div className="flex-1 flex flex-col gap-4">
                                <div>
                                  <h3 className="text-3xl font-bold text-white">
                                    {sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.championName ||
                                      "Unknown"}
                                  </h3>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Highest Damage Taken Game
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Total Damage Taken
                                  </span>
                                  <span className="text-2xl font-bold text-blue-400">
                                    {Math.round(
                                      (sceneData?.insight?.vizData?.stats
                                        ?.highestDamageTaken || 0) / 1000
                                    )}
                                    K
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    KDA
                                  </span>
                                  <span className="text-2xl font-bold text-yellow-400">
                                    {sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.kda || "0/0/0"}
                                  </span>
                                </div>

                                {/* Items Build */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Items
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      sceneData?.insight?.vizData
                                        ?.maxDamageTakenMatch?.items || []
                                    )
                                      .filter((item: number) => item !== 0)
                                      .map((itemId: number, idx: number) => (
                                        <img
                                          key={idx}
                                          src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                                          alt={`Item ${itemId}`}
                                          className="w-10 h-10 rounded border border-gray-600"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                          }}
                                        />
                                      ))}
                                  </div>
                                </div>

                                {/* Summoner Spells */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Summoner Spells
                                  </p>
                                  <div className="flex gap-2">
                                    {sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.summoner1Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData
                                            .maxDamageTakenMatch.summoner1Id ===
                                          21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner1Id === 12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 1"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                    {sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.summoner2Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData
                                            .maxDamageTakenMatch.summoner2Id ===
                                          21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxDamageTakenMatch
                                                .summoner2Id === 12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 2"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Result
                                  </span>
                                  <span
                                    className={`text-2xl font-bold ${
                                      sceneData?.insight?.vizData
                                        ?.maxDamageTakenMatch?.result ===
                                      "Victory"
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {sceneData?.insight?.vizData
                                      ?.maxDamageTakenMatch?.result ||
                                      "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "total_healed" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${Math.round(
                            (sceneData?.insight?.vizData?.totalHeal || 0) / 1000
                          )}K total healing.`,
                          `Average of ${(
                            sceneData?.insight?.vizData?.averages?.avgHeal || 0
                          ).toLocaleString()} healing per game.`,
                          `Your best match healed ${Math.round(
                            (sceneData?.insight?.vizData?.maxHealMatch
                              ?.healing || 0) / 1000
                          )}K with ${
                            sceneData?.insight?.vizData?.maxHealMatch
                              ?.championName || "Unknown"
                          }.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Champion Card - Highest Healing Game */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl p-6">
                            <div className="flex gap-8 items-center">
                              {/* Champion Loading Screen Image - Left */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                                    sceneData?.insight?.vizData?.maxHealMatch
                                      ?.championName || "Soraka"
                                  }_0.jpg`}
                                  alt={
                                    sceneData?.insight?.vizData?.maxHealMatch
                                      ?.championName || "Champion"
                                  }
                                  className="w-64 h-auto rounded-lg border-2 border-green-500/50 shadow-2xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
                                  }}
                                />
                              </div>

                              {/* Stats Column - Right */}
                              <div className="flex-1 flex flex-col gap-4">
                                <div>
                                  <h3 className="text-3xl font-bold text-white">
                                    {sceneData?.insight?.vizData?.maxHealMatch
                                      ?.championName || "Unknown"}
                                  </h3>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Highest Healing Game
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    KDA
                                  </span>
                                  <span className="text-2xl font-bold text-yellow-400">
                                    {sceneData?.insight?.vizData?.maxHealMatch
                                      ?.kda || "0/0/0"}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Damage Healed
                                  </span>
                                  <span className="text-2xl font-bold text-lime-400">
                                    {Math.round(
                                      (sceneData?.insight?.vizData?.stats
                                        ?.highestHealing || 0) / 1000
                                    )}
                                    K
                                  </span>
                                </div>

                                {/* Items Build */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Items
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      sceneData?.insight?.vizData?.maxHealMatch
                                        ?.items || []
                                    )
                                      .filter((item: number) => item !== 0)
                                      .map((itemId: number, idx: number) => (
                                        <img
                                          key={idx}
                                          src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                                          alt={`Item ${itemId}`}
                                          className="w-10 h-10 rounded border border-gray-600"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                          }}
                                        />
                                      ))}
                                  </div>
                                </div>

                                {/* Summoner Spells */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Summoner Spells
                                  </p>
                                  <div className="flex gap-2">
                                    {sceneData?.insight?.vizData?.maxHealMatch
                                      ?.summoner1Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData.maxHealMatch
                                            .summoner1Id === 21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner1Id === 12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 1"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                    {sceneData?.insight?.vizData?.maxHealMatch
                                      ?.summoner2Id && (
                                      <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                          sceneData.insight.vizData.maxHealMatch
                                            .summoner2Id === 21
                                            ? "Barrier"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 1
                                            ? "Boost"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 14
                                            ? "Dot"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 3
                                            ? "Exhaust"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 4
                                            ? "Flash"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 6
                                            ? "Haste"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 7
                                            ? "Heal"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 13
                                            ? "Mana"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 30
                                            ? "PoroRecall"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 31
                                            ? "PoroThrow"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 11
                                            ? "Smite"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 39
                                            ? "SnowURFSnowball_Mark"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 32
                                            ? "Snowball"
                                            : sceneData.insight.vizData
                                                .maxHealMatch.summoner2Id === 12
                                            ? "Teleport"
                                            : "Flash"
                                        }.png`}
                                        alt="Summoner 2"
                                        className="w-10 h-10 rounded border border-gray-600"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "gold_share" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${Math.round(
                            (sceneData?.insight?.vizData?.totalGoldEarned ||
                              0) / 1000
                          )}K total gold earned.`,
                          `Average of ${
                            sceneData?.insight?.vizData?.averages
                              ?.avgGoldPerMinute || 0
                          } gold per minute.`,
                          `Your gold income throughout the year — economic efficiency tracked.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="line" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "farmer" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${(
                            sceneData?.insight?.vizData?.stats?.totalCS || 0
                          ).toLocaleString()} total creeps slain.`,
                          `Average CS per minute: ${
                            sceneData?.insight?.vizData?.stats?.avgCSPerMin || 0
                          }.`,
                          `Your best performance: ${
                            sceneData?.insight?.vizData?.bestCSGame?.cs || 0
                          } CS on ${
                            sceneData?.insight?.vizData?.bestCSGame
                              ?.championName || "Unknown"
                          }.`,
                          `Every minion matters. Gold is power.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="line" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "signature_position" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.mostPlayedPosition
                              ?.position || "Unknown"
                          } — ${
                            sceneData?.insight?.vizData?.mostPlayedPosition
                              ?.games || 0
                          } games played.`,
                          `Your win rate is ${
                            sceneData?.insight?.vizData?.mostPlayedPosition?.winRate?.toFixed(
                              1
                            ) || 0
                          }% in this role.`,
                          `You have found your preferred battlefield.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Position Card with Top 3 Champions */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-700/50 rounded-xl p-6">
                            <div className="flex gap-8 items-center">
                              {/* Top 3 Champions - Left */}
                              <div className="flex-shrink-0 flex flex-col gap-3">
                                {(
                                  sceneData?.insight?.vizData
                                    ?.mostPlayedPosition?.topChampions || []
                                )
                                  .slice(0, 3)
                                  .map((champ: any, idx: number) => (
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
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src =
                                            "/images/champions/purepng.com-classic-ahri-splashartahrilolleague-of-legendsrender-331521944371xxthp.png";
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
                                  <h3 className="text-3xl font-bold text-white">
                                    {sceneData?.insight?.vizData
                                      ?.mostPlayedPosition?.position ||
                                      "Unknown Position"}
                                  </h3>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Most Played Position
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Matches
                                  </span>
                                  <span className="text-2xl font-bold text-white">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.matches || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Avg. Win Rate
                                  </span>
                                  <span className="text-2xl font-bold text-cyan-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.winRate || 0}
                                    %
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Avg Damage/Minute
                                  </span>
                                  <span className="text-2xl font-bold text-orange-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.avgDamagePerMin || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Avg Vision Score
                                  </span>
                                  <span className="text-2xl font-bold text-yellow-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.avgVisionScore || 0}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <span className="text-sm text-gray-300">
                                    Avg CS/Minute
                                  </span>
                                  <span className="text-2xl font-bold text-green-400">
                                    {sceneData?.insight?.vizData?.stats
                                      ?.avgCSPerMin || "0.0"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "growth_over_time" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.metrics?.[3]?.value || "Stable"
                          } trend detected over the year.`,
                          `Win rate: ${
                            sceneData?.insight?.metrics?.[0]?.value || 0
                          }% across all games.`,
                          `Average damage: ${
                            sceneData?.insight?.metrics?.[1]?.value || 0
                          }K per game.`,
                          `Your evolution has been... documented.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="line" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "vision_score" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.averages
                              ?.avgVisionScore || 0
                          } average vision score per game.`,
                          `${
                            sceneData?.insight?.vizData?.totals
                              ?.totalWardsPlaced || 0
                          } wards placed, ${
                            sceneData?.insight?.vizData?.totals
                              ?.totalWardsKilled || 0
                          } wards cleared.`,
                          `${
                            sceneData?.insight?.vizData?.totals
                              ?.totalVisionWardsBought || 0
                          } control wards purchased.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* Vision Ward Display */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-700/50 rounded-xl p-8">
                            <div className="flex flex-col items-center gap-6">
                              {/* Ward Images Placeholder */}
                              <div className="flex gap-8 items-center justify-center">
                                {/* Stealth Ward */}
                                <div className="flex flex-col items-center">
                                  <div className="w-32 h-32 bg-gray-700/50 rounded-lg border-2 border-yellow-500/50 flex items-center justify-center mb-3 p-2">
                                    <img
                                      src="https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/3340.png"
                                      alt="Stealth Ward"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                      Avg. Wards Placed
                                    </p>
                                    <p className="text-2xl font-bold text-yellow-400">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgWardsPlaced || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      per game
                                    </p>
                                  </div>
                                </div>

                                {/* Control Ward */}
                                <div className="flex flex-col items-center">
                                  <div className="w-32 h-32 bg-gray-700/50 rounded-lg border-2 border-pink-500/50 flex items-center justify-center mb-3 p-2">
                                    <img
                                      src="https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/2055.png"
                                      alt="Control Ward"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                      Avg. Control Wards
                                    </p>
                                    <p className="text-2xl font-bold text-pink-400">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgVisionWardsBought || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      per game
                                    </p>
                                  </div>
                                </div>

                                {/* Sweeping Lens */}
                                <div className="flex flex-col items-center">
                                  <div className="w-32 h-32 bg-gray-700/50 rounded-lg border-2 border-red-500/50 flex items-center justify-center mb-3 p-2">
                                    <img
                                      src="https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/3364.png"
                                      alt="Sweeping Lens"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                      Avg. Wards Cleared
                                    </p>
                                    <p className="text-2xl font-bold text-red-400">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgWardsKilled || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      per game
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Vision Score Summary */}
                              <div className="w-full bg-black/30 rounded-lg p-6 mt-4">
                                <div className="text-center">
                                  <p className="text-sm text-gray-400 mb-2">
                                    Avg. Vision Score
                                  </p>
                                  <p className="text-4xl font-bold text-white">
                                    {sceneData?.insight?.vizData?.averages
                                      ?.avgVisionScore || 0}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-2">
                                    {sceneData?.insight?.vizData?.averages
                                      ?.avgVisionScorePerMinute || 0}{" "}
                                    per minute
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "weaknesses" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `Areas for improvement identified.`,
                          `Average deaths per game: ${
                            sceneData?.insight?.vizData?.stats
                              ?.avgDeathsPerGame ||
                            sceneData?.insight?.metrics?.[0]?.value ||
                            0
                          } — optimization required.`,
                          `Time spent dead: ${
                            sceneData?.insight?.vizData?.stats?.avgDeadPercentage?.toFixed(
                              1
                            ) || 0
                          }% of each game on average.`,
                          `Knowledge of weakness is the first step to power.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto pb-6"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Total Across All Matches Pie Chart */}
                          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4 text-center">
                              Total Time Distribution
                            </h3>
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={
                                      sceneData?.insight?.vizData
                                        ?.totalPieChart || []
                                    }
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) =>
                                      `${name}: ${value.toFixed(1)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {(
                                      sceneData?.insight?.vizData
                                        ?.totalPieChart || []
                                    ).map((entry: any, index: number) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value: number) =>
                                      `${value.toFixed(2)}%`
                                    }
                                    contentStyle={{
                                      backgroundColor: "#1F2937",
                                      border: "1px solid #374151",
                                      borderRadius: "8px",
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-sm text-gray-400 text-center mt-2">
                              Across all matches
                            </p>
                          </div>

                          {/* Average Per Game Pie Chart */}
                          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4 text-center">
                              Average Per Game
                            </h3>
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={
                                      sceneData?.insight?.vizData
                                        ?.avgPieChart || []
                                    }
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) =>
                                      `${name}: ${value.toFixed(1)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {(
                                      sceneData?.insight?.vizData
                                        ?.avgPieChart || []
                                    ).map((entry: any, index: number) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value: number) =>
                                      `${value.toFixed(2)}%`
                                    }
                                    contentStyle={{
                                      backgroundColor: "#1F2937",
                                      border: "1px solid #374151",
                                      borderRadius: "8px",
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-sm text-gray-400 text-center mt-2">
                              Per match average
                            </p>
                          </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                          <div className="text-center">
                            <p className="text-sm text-gray-400">
                              Avg Deaths/Game
                            </p>
                            <p className="text-3xl font-bold text-red-400">
                              {sceneData?.insight?.vizData?.stats?.avgDeathsPerGame?.toFixed(
                                2
                              ) || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-400">
                              Avg Time Dead
                            </p>
                            <p className="text-3xl font-bold text-orange-400">
                              {sceneData?.insight?.vizData?.stats?.avgTimeSpentDeadMinutes?.toFixed(
                                1
                              ) || 0}{" "}
                              min
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : currentSceneId === "best_friend" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.title || "Unknown Ally"
                          } — your most frequent partner.`,
                          `${
                            sceneData?.insight?.vizData?.stats?.[0]?.value || 0
                          } games together.`,
                          `Win rate: ${
                            sceneData?.insight?.vizData?.stats?.[1]?.value ||
                            "0%"
                          }.`,
                          `Cooperation yields interesting results.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto pb-6"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {sceneData?.insight?.vizData?.puuid ? (
                          <BestFriendProfile
                            puuid={sceneData.insight.vizData.puuid as string}
                            stats={sceneData?.insight?.vizData?.stats}
                            recentGames={
                              sceneData?.insight?.vizData?.recentGames
                            }
                          />
                        ) : (
                          <Viz
                            kind="badge"
                            data={sceneData?.insight?.vizData}
                          />
                        )}
                      </div>
                    )}
                  </>
                ) : currentSceneId === "aram" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.vizData?.stats?.totalGames ||
                            sceneData?.insight?.metrics?.[0]?.value ||
                            0
                          } ARAM games detected.`,
                          `Win rate: ${
                            sceneData?.insight?.vizData?.stats?.winRate ||
                            sceneData?.insight?.metrics?.[1]?.value ||
                            0
                          }%.`,
                          `Chaos incarnate... yet still measurable.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz
                          kind="infographic"
                          data={sceneData?.insight?.vizData}
                        />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "ranked_stats" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `Analyzing ranked behavior... patterns of improvement detected.`,
                          `Your climb through the Rift contributes valuable data to my research.`,
                          `Ascend again — for science demands replication.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="ranked" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "killing_spree" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `Highest killing spree: ${
                            sceneData?.insight?.vizData?.stats?.longestSpree ||
                            sceneData?.insight?.metrics?.[2]?.value ||
                            0
                          } consecutive kills.`,
                          `${
                            sceneData?.insight?.vizData?.stats?.pentaKills ||
                            sceneData?.insight?.metrics?.[0]?.value ||
                            0
                          } pentakills achieved.`,
                          `Efficiency in execution.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="bar" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "dragon_slayer" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.metrics?.[0]?.value || 0
                          } dragons slain.`,
                          `${
                            sceneData?.insight?.metrics?.[1]?.value || 0
                          } barons secured.`,
                          `Objective control measured and documented.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz kind="bar" data={sceneData?.insight?.vizData} />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "sniper" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.metrics?.[0]?.value || 0
                          } total skillshots hit.`,
                          `${
                            sceneData?.insight?.metrics?.[1]?.value || 0
                          } average per game.`,
                          `Precision from distance... intriguing.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz
                          kind="highlight"
                          data={sceneData?.insight?.vizData}
                        />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "fancy_feet" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `${
                            sceneData?.insight?.metrics?.[0]?.value || 0
                          } total skillshots dodged.`,
                          `${
                            sceneData?.insight?.metrics?.[1]?.value || 0
                          } average dodges per game.`,
                          `Movement patterns analyzed and categorized.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz
                          kind="highlight"
                          data={sceneData?.insight?.vizData}
                        />
                      </div>
                    )}
                  </>
                ) : currentSceneId === "path_forward" ? (
                  <>
                    <div className="mb-6" key={currentSceneId}>
                      <ProgressiveText
                        key={`${currentSceneId}-${currentSceneIndex}`}
                        segments={[
                          `Analysis complete. Your journey documented.`,
                          `${
                            sceneData?.insight?.metrics?.[0]?.value || 0
                          } games played in 2025.`,
                          `The future requires deliberate action.`,
                        ]}
                        typingSpeed={40}
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {
                          setContentComplete(true);
                          setShowHeatmap(true);
                        }}
                      />
                    </div>
                    {showHeatmap && (
                      <div
                        className="flex-1 overflow-auto"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        <Viz
                          kind="highlight"
                          data={sceneData?.insight?.vizData}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Fallback for any undefined scenes */}
                    <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">
                      {sceneData?.insight?.summary}
                    </h2>
                    <div className="flex-1 mb-4 overflow-hidden">
                      <Viz
                        kind={sceneData?.vizKind || "highlight"}
                        data={sceneData?.insight?.vizData}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                      {(sceneData?.insight?.metrics || []).slice(0, 4).map(
                        (
                          metric: {
                            label: string;
                            value: string | number;
                            unit?: string;
                            context?: string;
                          },
                          index: number
                        ) => (
                          <div
                            key={index}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
                          >
                            <div className="text-xs text-gray-300">
                              {metric.label}
                            </div>
                            <div className="text-lg font-bold text-white">
                              {metric.value}
                              {metric.unit || ""}
                            </div>
                            {metric.context && (
                              <div className="text-xs text-gray-400 truncate">
                                {metric.context}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Spacer for Navigation */}
        <div className="h-20 flex-shrink-0"></div>
      </div>

      {/* Vel'Koz Character with Dialogue - Bottom Right */}
      <div className="absolute bottom-0 right-0 z-25 pointer-events-none">
        <div
          className="relative"
          style={{ marginBottom: "-10vh", marginRight: "-5vw" }}
        >
          <img
            src="/images/ai-agents/velkoz.png"
            alt="Vel'Koz"
            className="h-[50vh] w-auto object-contain drop-shadow-2xl pointer-events-none"
          />

          {/* Dialogue Bubble - Show after content complete for all scenes */}
          {narration && contentComplete && (
            <div className="absolute top-8 right-[45vh] pointer-events-auto">
              <DialogueBubble
                text={
                  currentSceneId === "year_in_motion"
                    ? [
                        "Intriguing patterns detected in your temporal distribution.",
                        "Your commitment to mastery is... noted.",
                        "Continue this trajectory, and perhaps you will transcend mortal limitations.",
                      ]
                    : currentSceneId === "signature_champion"
                    ? [
                        "A predictable choice. Specialization yields efficiency.",
                        "Your win rate correlates with repeated exposure to mechanical patterns.",
                        "Mastery achieved through repetition... how very mortal.",
                      ]
                    : currentSceneId === "damage_share"
                    ? [
                        "Your damage output has been quantified and analyzed.",
                        "Fascinating how numbers reveal the truth of combat prowess.",
                        "Continue refining your offensive capabilities, subject.",
                      ]
                    : currentSceneId === "damage_taken"
                    ? [
                        "The punishment you endure is... substantial.",
                        "Either you are exceptionally durable, or exceptionally reckless.",
                        "Data suggests a combination of both.",
                      ]
                    : currentSceneId === "total_healed"
                    ? [
                        "Life force restoration measured and catalogued.",
                        "Your support capabilities demonstrate utility.",
                        "Healing is merely damage prevention... efficient.",
                      ]
                    : currentSceneId === "gold_share"
                    ? [
                        "Economic efficiency: a critical factor in victory.",
                        "Your gold acquisition patterns reveal strategic priorities.",
                        "Resource management correlates directly with success.",
                      ]
                    : currentSceneId === "signature_position"
                    ? [
                        "You have established territorial preferences.",
                        "Consistency in role selection shows adaptability... or stubbornness.",
                        "The data remains inconclusive on which.",
                      ]
                    : currentSceneId === "growth_over_time"
                    ? [
                        "Your progression arc has been documented.",
                        "Evolution through experience... a predictable phenomenon.",
                        "Yet the rate of improvement varies. Fascinating.",
                      ]
                    : currentSceneId === "vision_score"
                    ? [
                        "Information is power. Vision is information.",
                        "Your investment in map awareness shows tactical understanding.",
                        "Those who see more, control more.",
                      ]
                    : currentSceneId === "weaknesses"
                    ? [
                        "Every specimen has vulnerabilities.",
                        "Acknowledging weakness is the first step to optimization.",
                        "These data points require your attention, subject.",
                      ]
                    : currentSceneId === "best_friend"
                    ? [
                        "Cooperation detected. Duo synergy analyzed.",
                        "This alliance yields statistical significance.",
                        "Perhaps companionship has measurable strategic value.",
                      ]
                    : currentSceneId === "aram"
                    ? [
                        "Chaos on the Howling Abyss... yet patterns emerge.",
                        "Even randomness can be quantified and understood.",
                        "Your performance in disorder has been catalogued.",
                      ]
                    : currentSceneId === "ranked_stats"
                    ? [
                        "The competitive ladder: a hierarchy of skill.",
                        "Your position reflects accumulated performance data.",
                        "Climb higher, and the view becomes more... enlightening.",
                      ]
                    : currentSceneId === "killing_spree"
                    ? [
                        "Sequential eliminations without interruption.",
                        "Your aggression patterns show efficient lethality.",
                        "Death comes swiftly when properly calculated.",
                      ]
                    : currentSceneId === "dragon_slayer"
                    ? [
                        "Objective control: the foundation of strategic dominance.",
                        "Dragons provide measurable power increases.",
                        "Your team's success hinges on these acquisitions.",
                      ]
                    : currentSceneId === "sniper"
                    ? [
                        "Precision from distance demonstrates mechanical finesse.",
                        "Range advantage: a fundamental combat principle.",
                        "Your long-range eliminations have been noted.",
                      ]
                    : currentSceneId === "fancy_feet"
                    ? [
                        "Spatial repositioning: critical for survival.",
                        "Your movement data reveals defensive priorities.",
                        "Those who move well, live longer.",
                      ]
                    : currentSceneId === "path_forward"
                    ? [
                        "All data converges to this conclusion.",
                        "Improvement requires deliberate, focused action.",
                        "Your path forward is clear. Will you follow it?",
                      ]
                    : [
                        narration.opening,
                        narration.analysis,
                        narration.actionable,
                      ]
                }
                typingSpeed={35}
                className="max-w-md"
                onAdvance={playDialogueClickSound}
                onComplete={() => setDialogueComplete(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Previous Button - Left Center */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={goToPrevious}
          disabled={currentSceneIndex === 0}
          className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 disabled:bg-black/20 disabled:text-gray-500 backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
      </div>

      {/* Next/Complete Button - Right Center */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={goToNext}
          disabled={!dialogueComplete}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 disabled:from-gray-600/80 disabled:to-gray-700/80 disabled:cursor-not-allowed backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-sm"
        >
          <span className="hidden sm:inline">
            {currentSceneIndex === SCENE_ORDER.length - 1
              ? "Back to Menu"
              : "Next"}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scene Counter - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
          <div className="text-center">
            <div className="text-base sm:text-lg font-bold text-white">
              {currentSceneIndex + 1} / {SCENE_ORDER.length}
            </div>
            <div className="text-xs text-gray-300 max-w-32 truncate hidden sm:block">
              {SCENE_ORDER[currentSceneIndex]
                ?.replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
