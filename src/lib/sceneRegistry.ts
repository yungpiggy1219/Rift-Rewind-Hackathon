import { SceneId, ScenePayload, VizKind } from "./types";
import { computeYearInMotion } from "./compute/computeYearInMotion";
import { computeSignatureChampion } from "./compute/computeSignatureChampion";
import { computeGrowth } from "./compute/computeGrowth";
import { computeDamageShare } from "./compute/computeDamageShare";
import { computeDamageTaken } from "./compute/computeDamageTaken";
import { computeHealed } from "./compute/computeHealed";
import { computeGoldShare } from "./compute/computeGoldShare";
import { computeSignaturePosition } from "./compute/computeSignaturePosition";
import { computeVisionScore } from "./compute/computeVisionScore";
import { computeWeaknesses } from "./compute/computeWeaknesses";
import { computeAllies } from "./compute/computeAllies";
import { computeARAM } from "./compute/computeAram";
import { computeRanked } from "./compute/computeRanked";
import { computeKillingSpree } from "./compute/computeKillingSpree";
import { computeDragonSlayer } from "./compute/computeDragonSlayer";
import { computeSniper } from "./compute/computeSniper";
import { computeFancyFeet } from "./compute/computeFancyFeet";
import { computePathForward } from "./compute/computePathForward";

export interface SceneDefinition {
  label: string;
  compute: (ctx: {
    puuid: string;
    matchIds: string[];
  }) => Promise<ScenePayload>;
  vizKind: VizKind;
}

export const sceneRegistry: Record<SceneId, SceneDefinition> = {
  year_in_motion: {
    label: "Year in Motion",
    compute: computeYearInMotion,
    vizKind: "heatmap",
  },
  signature_champion: {
    label: "Signature Champion",
    compute: computeSignatureChampion,
    vizKind: "radar",
  },
  damage_share: {
    label: "Damage Share",
    compute: computeDamageShare,
    vizKind: "bar",
  },
  damage_taken: {
    label: "Damage Taken",
    compute: computeDamageTaken,
    vizKind: "bar",
  },
  total_healed: {
    label: "Total Healed",
    compute: computeHealed,
    vizKind: "bar",
  },
  gold_share: {
    label: "Gold Share",
    compute: computeGoldShare,
    vizKind: "line",
  },
  signature_position: {
    label: "Signature Position",
    compute: computeSignaturePosition,
    vizKind: "bar",
  },

  vision_score: {
    label: "Vision Score",
    compute: computeVisionScore,
    vizKind: "bar",
  },

  weaknesses: {
    label: "Areas for Growth",
    compute: computeWeaknesses,
    vizKind: "bar",
  },
  best_friend: {
    label: "Trusted Ally",
    compute: computeAllies,
    vizKind: "badge",
  },

  growth_over_time: {
    label: "Growth Over Time",
    compute: computeGrowth,
    vizKind: "line",
  },

  aram: {
    label: "ARAM Adventures",
    compute: computeARAM,
    vizKind: "infographic",
  },

  ranked_stats: {
    label: "Ranked Journey",
    compute: computeRanked,
    vizKind: "highlight",
  },

  killing_spree: {
    label: "Killing Spree",
    compute: computeKillingSpree,
    vizKind: "bar",
  },

  dragon_slayer: {
    label: "Dragon Slayer",
    compute: computeDragonSlayer,
    vizKind: "bar",
  },

  sniper: {
    label: "Sniper",
    compute: computeSniper,
    vizKind: "highlight",
  },

  fancy_feet: {
    label: "Fancy Feet",
    compute: computeFancyFeet,
    vizKind: "highlight",
  },

  path_forward: {
    label: "Path Forward",
    compute: computePathForward,
    vizKind: "highlight",
  },
  /*
  peak_performance: {
    label: "Peak Performance",
    compute: computePeak,
    vizKind: "highlight"
  },
  legacy: {
    label: "Your Legacy",
    compute: async () => ({ sceneId: "legacy", vizKind: "timeline", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "timeline"
  } */
};

export const SCENE_ORDER: SceneId[] = [
  "year_in_motion",
  "signature_champion",
  "damage_share",
  "damage_taken",
  "total_healed",
  "gold_share",
  "signature_position",
  "growth_over_time",
  "vision_score",
  "weaknesses",
  "best_friend",
  "aram",
  "ranked_stats",
  "killing_spree",
  "dragon_slayer",
  "sniper",
  "fancy_feet",
  "path_forward",
];

export function getSceneDefinition(sceneId: SceneId): SceneDefinition {
  return sceneRegistry[sceneId];
}

export function getAllScenes(): Array<{
  id: SceneId;
  definition: SceneDefinition;
}> {
  return SCENE_ORDER.map((id) => ({ id, definition: sceneRegistry[id] }));
}
