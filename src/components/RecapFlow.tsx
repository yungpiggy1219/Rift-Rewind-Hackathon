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
import ChampionCard from "./ChampionCard";
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
  const [showQuestions, setShowQuestions] = useState(false); // Track if question buttons should show
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null); // Track selected question
  const [aiAnswer, setAiAnswer] = useState<string | null>(null); // Track AI answer
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false); // Track loading state for answer
  const [followUpDialogue, setFollowUpDialogue] = useState<string | null>(null); // Track follow-up dialogue after Q&A
  const [fadeIn, setFadeIn] = useState(false); // Track fade-in animation
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false); // Track scene fade transition
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
  const drakeDeathSfxRef = useRef<HTMLAudioElement | null>(null);
  const healSfxRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const currentSceneId = SCENE_ORDER[currentSceneIndex];

  // Trigger fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize sound effects
  useEffect(() => {
    if (typeof window !== "undefined") {
      clickSfxRef.current = new Audio("/sfx/pm.mp3");
      smiteSfxRef.current = new Audio("/sfx/smite.mp3");
      baronRecallSfxRef.current = new Audio("/sfx/baron_recall.mp3");
      drakeDeathSfxRef.current = new Audio("/sfx/drake_death.mp3");
      healSfxRef.current = new Audio("/sfx/heal.mp3");
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
      if (drakeDeathSfxRef.current) {
        drakeDeathSfxRef.current.pause();
      }
      if (healSfxRef.current) {
        healSfxRef.current.pause();
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
          puuid: puuid,
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

  // Play scene-specific sound effects when scene data loads
  useEffect(() => {
    // Play sound only when scene is loaded (sceneData exists)
    if (!sceneData) return;

    if (currentSceneId === "dragon_slayer") {
      // Play drake death sound for dragon slayer scene
      if (drakeDeathSfxRef.current) {
        drakeDeathSfxRef.current.currentTime = 0;
        drakeDeathSfxRef.current.play().catch((error) => {
          console.log("Drake death sound failed:", error);
        });
      }
    } else if (currentSceneId === "total_healed") {
      // Play heal sound for healing scene
      if (healSfxRef.current) {
        healSfxRef.current.currentTime = 0;
        healSfxRef.current.play().catch((error) => {
          console.log("Heal sound failed:", error);
        });
      }
    }
  }, [currentSceneId, sceneData]);

  const goToNext = () => {
    if (currentSceneIndex < SCENE_ORDER.length - 1) {
      // Play smite sound for "Next"
      if (smiteSfxRef.current) {
        smiteSfxRef.current.currentTime = 0;
        smiteSfxRef.current.play().catch((error) => {
          console.log("Smite sound failed:", error);
        });
      }

      // Start fade transition
      setIsSceneTransitioning(true);
      
      // After fade out completes, change scene
      setTimeout(() => {
        setCurrentSceneIndex(currentSceneIndex + 1);
        // Reset state for next scene
        setContentComplete(false);
        setShowHeatmap(false);
        setDialogueComplete(false);
        setShowQuestions(false);
        setSelectedQuestion(null);
        setAiAnswer(null);
        setFollowUpDialogue(null);
        setIsSceneTransitioning(false); // Fade back in
      }, 500);
    } else {
      // On last scene, "Back to Menu" button - play baron recall sound fully
      if (baronRecallSfxRef.current) {
        baronRecallSfxRef.current.currentTime = 0;

        // Wait for the sound to finish playing before navigating
        const handleSoundEnd = () => {
          baronRecallSfxRef.current?.removeEventListener(
            "ended",
            handleSoundEnd
          );
          goBack();
        };

        baronRecallSfxRef.current.addEventListener("ended", handleSoundEnd);

        baronRecallSfxRef.current.play().catch((error) => {
          console.log("Baron recall sound failed:", error);
          // If sound fails, still navigate after a short delay
          setTimeout(() => {
            goBack();
          }, 500);
        });
      } else {
        // If no sound ref, navigate immediately
        goBack();
      }
    }
  };

  const goToPrevious = () => {
    if (currentSceneIndex > 0) {
      // Start fade transition
      setIsSceneTransitioning(true);
      
      // After fade out completes, change scene
      setTimeout(() => {
        setCurrentSceneIndex(currentSceneIndex - 1);
        // Reset state for previous scene
        setContentComplete(false);
        setShowHeatmap(false);
        setDialogueComplete(false);
        setShowQuestions(false);
        setSelectedQuestion(null);
        setAiAnswer(null);
        setFollowUpDialogue(null);
        setIsSceneTransitioning(false); // Fade back in
      }, 500);
    }
  };

  const goBack = () => {
    router.push(
      `/menu/${puuid}?name=${encodeURIComponent(playerName || "Summoner")}&tag=`
    );
  };

  // Handle question click - fetch AI answer
  const handleQuestionClick = async (question: string) => {
    setSelectedQuestion(question);
    setIsLoadingAnswer(true);
    setAiAnswer(null);

    try {
      console.log("[RecapFlow] Requesting answer for question:", question);
      console.log("[RecapFlow] Scene data insight:", sceneData?.insight);
      
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          playerName: playerName || "Summoner",
          sceneId: currentSceneId,
          question,
          insight: sceneData?.insight, // This is the SceneInsight object the API expects
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[RecapFlow] API error:", errorData);
        throw new Error(errorData.error || "Failed to get answer");
      }

      const data = await response.json();
      console.log("[RecapFlow] Received answer:", data);
      setAiAnswer(data.answer || "Unable to provide answer at this time.");
    } catch (error) {
      console.error("[RecapFlow] Error fetching answer:", error);
      setAiAnswer(
        "My computational resources are temporarily unavailable. Try again."
      );
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  // Handle back to questions
  const handleBackToQuestions = () => {
    setSelectedQuestion(null);
    setAiAnswer(null);
    // Set Vel'Koz follow-up dialogue
    setFollowUpDialogue("Fascinating... Anything else you wish to know about this data?");
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
            backgroundImage: `url(/images/backgrounds/background_${currentSceneIndex + 1}.jpg)`,
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
      {/* Fade-in from black overlay */}
      <div 
        className="absolute inset-0 bg-black z-50 pointer-events-none"
        style={{
          opacity: fadeIn ? 0 : 1,
          transition: 'opacity 1.5s ease-out',
        }}
      />
      
      {/* Scene Fade Transition Overlay */}
      <div 
        className="absolute inset-0 bg-black z-45 pointer-events-none"
        style={{
          opacity: isSceneTransitioning ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />
      
      {/* Background Image with Tilt Effect */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(/images/backgrounds/background_${currentSceneIndex + 1}.jpg)`,
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

      {/* Main Content Area - Fixed Height Layout */}
      <div className="absolute inset-0 z-20 flex flex-col">
        {/* Top Spacer for Navigation */}
        <div className="h-20 flex-shrink-0"></div>

        {/* Scene Content - Takes remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden relative">
          {isLoading ? (
            <div 
              className="text-center bg-black/40 backdrop-blur-lg rounded-2xl p-6 border-4"
              style={{
                borderColor: '#785A28',
                boxShadow: '0 0 0 1px #9D7B3A, 0 0 20px rgba(120, 90, 40, 0.5)'
              }}
            >
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Baking cookies for poros...
              </h3>
            </div>
          ) : sceneData && narration ? (
            <div className="w-full h-full max-w-5xl mx-auto flex items-center justify-center">
              {/* Centered Visualization Panel */}
              <div 
                className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border-4 flex flex-col overflow-hidden max-w-3xl w-full max-h-[calc(100vh-200px)]"
                style={{
                  borderColor: '#785A28',
                  boxShadow: '0 0 0 1px #9D7B3A, 0 0 10px rgba(120, 90, 40, 0.5)'
                }}
              >
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
                        <ChampionCard
                          championName={sceneData?.insight?.vizData?.mostPlayed?.championName || "Unknown"}
                          championImageUrl={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                            sceneData?.insight?.vizData?.mostPlayed?.championName || "Aatrox"
                          }_0.jpg`}
                          title="Most Played Champion"
                          stats={[
                            {
                              label: "Avg. nWin Rate",
                              value: `${sceneData?.insight?.vizData?.stats?.winRate || 0}%`,
                              color: "#06b6d4"
                            },
                            {
                              label: "Avg. KDA",
                              value: sceneData?.insight?.vizData?.stats?.kda || "0.00",
                              color: "#ffffff"
                            },
                            {
                              label: "Avg. Damage to Champions",
                              value: sceneData?.insight?.vizData?.stats?.damageToChampions || 0,
                              color: "#fb923c"
                            },
                            {
                              label: "Avg. Vision Score",
                              value: sceneData?.insight?.vizData?.stats?.visionScore || 0,
                              color: "#eab308"
                            },
                          ]}
                          backgroundGradient="from-blue-900/30 to-purple-900/30"
                          borderColor="border-blue-700/50"
                        />
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
                        <ChampionCard
                          championName={sceneData?.insight?.vizData?.maxDamageMatch?.championName || "Unknown"}
                          championImageUrl={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                            sceneData?.insight?.vizData?.maxDamageMatch?.championName || "Aatrox"
                          }_0.jpg`}
                          title="Highest Damage Dealt Game"
                          stats={[
                            {
                              label: "KDA",
                              value: sceneData?.insight?.vizData?.maxDamageMatch?.kda || "0/0/0",
                              color: "#06b6d4"
                            },
                            {
                              label: "Total Damage to Champions",
                              value: `${Math.round((sceneData?.insight?.vizData?.stats?.highestDamage || 0) / 1000)}K`,
                              color: "#eab308"
                            }
                          ]}
                          items={sceneData?.insight?.vizData?.maxDamageMatch?.items}
                          summonerSpells={{
                            spell1Id: sceneData?.insight?.vizData?.maxDamageMatch?.summoner1Id || 4,
                            spell2Id: sceneData?.insight?.vizData?.maxDamageMatch?.summoner2Id || 4
                          }}
                          backgroundGradient="from-red-900/30 to-orange-900/30"
                          borderColor="border-red-700/50"
                        />
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
                        <ChampionCard
                          championName={sceneData?.insight?.vizData?.maxDamageTakenMatch?.championName || "Unknown"}
                          championImageUrl={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                            sceneData?.insight?.vizData?.maxDamageTakenMatch?.championName || "Aatrox"
                          }_0.jpg`}
                          title="Highest Damage Taken Game"
                          stats={[
                            {
                              label: "KDA",
                              value: sceneData?.insight?.vizData?.maxDamageTakenMatch?.kda || "0/0/0",
                              color: "#eab308"
                            },
                            {
                              label: "Total Damage Taken",
                              value: `${Math.round((sceneData?.insight?.vizData?.stats?.highestDamageTaken || 0) / 1000)}K`,
                              color: "#3b82f6"
                            }
                          ]}
                          items={sceneData?.insight?.vizData?.maxDamageTakenMatch?.items}
                          summonerSpells={{
                            spell1Id: sceneData?.insight?.vizData?.maxDamageTakenMatch?.summoner1Id || 4,
                            spell2Id: sceneData?.insight?.vizData?.maxDamageTakenMatch?.summoner2Id || 4
                          }}
                          backgroundGradient="from-purple-900/30 to-blue-900/30"
                          borderColor="border-purple-700/50"
                        />
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
                        <ChampionCard
                          championName={sceneData?.insight?.vizData?.maxHealMatch?.championName || "Unknown"}
                          championImageUrl={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                            sceneData?.insight?.vizData?.maxHealMatch?.championName || "Soraka"
                          }_0.jpg`}
                          title="Highest Healing Game"
                          stats={[
                            {
                              label: "KDA",
                              value: sceneData?.insight?.vizData?.maxHealMatch?.kda || "0/0/0",
                              color: "#eab308"
                            },
                            {
                              label: "Damage Healed",
                              value: `${Math.round((sceneData?.insight?.vizData?.stats?.highestHealing || 0) / 1000)}K`,
                              color: "#65a30d"
                            }
                          ]}
                          items={sceneData?.insight?.vizData?.maxHealMatch?.items}
                          summonerSpells={{
                            spell1Id: sceneData?.insight?.vizData?.maxHealMatch?.summoner1Id || 4,
                            spell2Id: sceneData?.insight?.vizData?.maxHealMatch?.summoner2Id || 4
                          }}
                          backgroundGradient="from-green-900/30 to-emerald-900/30"
                          borderColor="border-green-700/50"
                        />
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
                          ).toLocaleString()} total minions slain.`,
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
                        <ChampionCard
                          championName={sceneData?.insight?.vizData?.mostPlayedPosition?.position || "Unknown Position"}
                          championImageUrl=""
                          title="Most Played Position"
                          stats={[
                            {
                              label: "Matches",
                              value: sceneData?.insight?.vizData?.stats?.matches || 0,
                              color: "#ffffff"
                            },
                            {
                              label: "Avg. Win Rate",
                              value: `${sceneData?.insight?.vizData?.stats?.winRate || 0}%`,
                              color: "#06b6d4"
                            },
                            {
                              label: "Avg Damage to Champions",
                              value: sceneData?.insight?.vizData?.stats?.avgDamagePerMin || 0,
                              color: "#fb923c"
                            },
                            {
                              label: "Avg Vision Score",
                              value: sceneData?.insight?.vizData?.stats?.avgVisionScore || 0,
                              color: "#eab308"
                            },
                          ]}
                          showPosition={true}
                          topChampions={sceneData?.insight?.vizData?.mostPlayedPosition?.topChampions}
                          backgroundGradient="from-indigo-900/30 to-purple-900/30"
                          borderColor="border-indigo-700/50"
                        />
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
                                    <p className="text-sm text-gray-400 font-friz">
                                      Avg. Wards Placed
                                    </p>
                                    <p className="text-2xl font-bold text-yellow-400 font-friz">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgWardsPlaced || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-friz">
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
                                    <p className="text-sm text-gray-400 font-friz">
                                      Avg. Control Wards
                                    </p>
                                    <p className="text-2xl font-bold text-pink-400 font-friz">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgVisionWardsBought || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-friz">
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
                                    <p className="text-sm text-gray-400 font-friz">
                                      Avg. Wards Cleared
                                    </p>
                                    <p className="text-2xl font-bold text-red-400 font-friz">
                                      {sceneData?.insight?.vizData?.averages
                                        ?.avgWardsKilled || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-friz">
                                      per game
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Vision Score Summary */}
                              <div className="w-full bg-black/30 rounded-lg p-6 mt-4">
                                <div className="text-center">
                                  <p className="text-sm text-gray-400 mb-2 font-friz">
                                    Avg. Vision Score
                                  </p>
                                  <p className="text-4xl font-bold text-white font-friz">
                                    {sceneData?.insight?.vizData?.averages
                                      ?.avgVisionScore || 0}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-2 font-friz">
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
                          `Here's your MVP performance of the year.`,
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
                    {showHeatmap && sceneData?.insight?.vizData?.mvpMatch && (
                      <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{
                          animation: "slideInFromBottom 0.6s ease-out forwards",
                          opacity: 0,
                        }}
                      >
                        {/* MVP Match Champion Card */}
                        <div className="max-w-4xl w-full">
                          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-700/50 rounded-xl p-6">
                            <div className="text-center mb-4">
                              <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                                🏆 MVP Match of 2025
                              </h3>
                              <p className="text-sm text-gray-300">
                                Performance Score:{" "}
                                {
                                  sceneData.insight.vizData.mvpMatch
                                    .performanceScore
                                }
                              </p>
                            </div>

                            <div className="flex gap-8 items-center">
                              {/* Champion Image */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${
                                    sceneData.insight.vizData.mvpMatch
                                      .championName || "Aatrox"
                                  }_0.jpg`}
                                  alt={
                                    sceneData.insight.vizData.mvpMatch
                                      .championName || "Champion"
                                  }
                                  className="w-64 h-auto rounded-lg border-2 border-yellow-500/50 shadow-2xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${
                                      sceneData.insight.vizData.mvpMatch
                                        .championName || "Aatrox"
                                    }_0.jpg`;
                                  }}
                                />
                              </div>

                              {/* Stats Column */}
                              <div className="flex-1 flex flex-col gap-4">
                                <div>
                                  <p className="text-sm text-gray-400 mb-2">
                                    Champion
                                  </p>
                                  <p className="text-3xl font-bold text-white">
                                    {sceneData.insight.vizData.mvpMatch
                                      .championName || "Unknown"}
                                  </p>
                                  <p
                                    className={`text-lg font-semibold ${
                                      sceneData.insight.vizData.mvpMatch.win
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {sceneData.insight.vizData.mvpMatch.win
                                      ? "Victory"
                                      : "Defeat"}
                                  </p>
                                </div>

                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-400">KDA</p>
                                  <p className="text-xl font-bold text-white">
                                    {sceneData.insight.vizData.mvpMatch.kills}/
                                    {sceneData.insight.vizData.mvpMatch.deaths}/
                                    {sceneData.insight.vizData.mvpMatch.assists}
                                    <span className="text-sm text-gray-400 ml-2">
                                      ({sceneData.insight.vizData.mvpMatch.kda}{" "}
                                      KDA)
                                    </span>
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-400">
                                    Damage
                                  </p>
                                  <p className="text-xl font-bold text-orange-400">
                                    {Math.round(
                                      (sceneData.insight.vizData.mvpMatch
                                        .damage || 0) / 1000
                                    )}
                                    K
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-400">
                                    Vision Score
                                  </p>
                                  <p className="text-xl font-bold text-yellow-400">
                                    {sceneData.insight.vizData.mvpMatch
                                      .visionScore || 0}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-400">CS</p>
                                  <p className="text-xl font-bold text-green-400">
                                    {sceneData.insight.vizData.mvpMatch.cs || 0}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-400">Gold</p>
                                  <p className="text-xl font-bold text-yellow-300">
                                    {Math.round(
                                      (sceneData.insight.vizData.mvpMatch
                                        .goldEarned || 0) / 1000
                                    )}
                                    K
                                  </p>
                                </div>

                                {/* Items Build */}
                                <div className="bg-black/30 rounded-lg px-6 py-4">
                                  <p className="text-sm text-gray-300 mb-3">
                                    Items
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      sceneData.insight.vizData.mvpMatch
                                        .items || []
                                    )
                                      .filter((item: number) => item !== 0)
                                      .map((itemId: number, idx: number) => (
                                        <img
                                          key={idx}
                                          src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                                          alt={`Item ${itemId}`}
                                          className="w-12 h-12 rounded border border-gray-600"
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
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                        sceneData.insight.vizData.mvpMatch
                                          .summoner1Id === 4
                                          ? "Flash"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 21
                                          ? "Barrier"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 1
                                          ? "Boost"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 14
                                          ? "Dot"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 3
                                          ? "Exhaust"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 6
                                          ? "Haste"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 7
                                          ? "Heal"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 11
                                          ? "Smite"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner1Id === 12
                                          ? "Teleport"
                                          : "Flash"
                                      }.png`}
                                      alt="Summoner Spell 1"
                                      className="w-12 h-12 rounded border border-gray-600"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/Summoner${
                                        sceneData.insight.vizData.mvpMatch
                                          .summoner2Id === 4
                                          ? "Flash"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 21
                                          ? "Barrier"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 1
                                          ? "Boost"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 14
                                          ? "Dot"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 3
                                          ? "Exhaust"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 6
                                          ? "Haste"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 7
                                          ? "Heal"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 11
                                          ? "Smite"
                                          : sceneData.insight.vizData.mvpMatch
                                              .summoner2Id === 12
                                          ? "Teleport"
                                          : "Ignite"
                                      }.png`}
                                      alt="Summoner Spell 2"
                                      className="w-12 h-12 rounded border border-gray-600"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
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
            className="h-[60vh] w-auto object-contain drop-shadow-2xl pointer-events-none"
          />

          {/* Dialogue Bubble - Show AI-generated narration after content complete */}
          {narration && contentComplete && (
            <div className="absolute top-8 right-[45vh] pointer-events-auto flex flex-col gap-4">
              {/* Main Dialogue */}
              {!selectedQuestion && (
                <DialogueBubble
                  text={
                    followUpDialogue
                      ? followUpDialogue
                      : currentSceneIndex === 0
                      ? [narration.opening, narration.analysis, narration.actionable]
                      : [narration.analysis, narration.actionable]
                  }
                  typingSpeed={35}
                  className="max-w-md"
                  onAdvance={playDialogueClickSound}
                  onComplete={() => {
                    setDialogueComplete(true);
                    setShowQuestions(true);
                  }}
                />
              )}

              {/* Question Buttons - Show BELOW dialogue after it completes */}
              {showQuestions && !selectedQuestion && dialogueComplete && narration?.followUpQuestions && (
                <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/50 shadow-2xl max-w-md">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-400">💭</span> Ask Vel&apos;Koz
                  </h3>
                  <div className="space-y-3">
                    {narration.followUpQuestions.slice(0, 3).map((fq, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(fq.question)}
                        className="w-full text-left px-4 py-3 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-all duration-200 border border-purple-400/30 hover:border-purple-400/60 text-sm"
                      >
                        {fq.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Answer Display - Replaces question buttons */}
              {selectedQuestion && (
                <>
                  {isLoadingAnswer ? (
                    <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/50 shadow-2xl max-w-md">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        <p className="text-white">Analyzing data...</p>
                      </div>
                    </div>
                  ) : aiAnswer ? (
                    <>
                      <DialogueBubble
                        text={[aiAnswer]}
                        typingSpeed={35}
                        className="max-w-md"
                        onAdvance={playDialogueClickSound}
                        onComplete={() => {}}
                      />
                      {/* Back Button */}
                      <button
                        onClick={handleBackToQuestions}
                        className="px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-all duration-200 border border-purple-400/30 hover:border-purple-400/60 text-sm flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Questions
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Previous Button - Left Center */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={goToPrevious}
          disabled={currentSceneIndex === 0}
          className="flex items-center gap-2 px-6 py-3 bg-black/40 hover:bg-black/60 disabled:bg-black/20 disabled:text-gray-500 backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-lg font-friz"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Previous</span>
        </button>
      </div>

      {/* Next/Complete Button - Right Center */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={goToNext}
          disabled={!dialogueComplete}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 disabled:from-gray-600/80 disabled:to-gray-700/80 disabled:cursor-not-allowed backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-lg font-friz"
        >
          <span className="hidden sm:inline">
            {currentSceneIndex === SCENE_ORDER.length - 1
              ? "Back to Menu"
              : "Next"}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Scene Counter - Bottom Center - REMOVE LATER */}
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
