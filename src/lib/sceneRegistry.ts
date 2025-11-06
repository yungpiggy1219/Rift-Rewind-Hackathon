import { SceneId, ScenePayload, VizKind } from './types';
import { computeYearInMotion } from './compute/computeYearInMotion';
import { computeSignatureChampion } from './compute/computeSignatureChampion';
import { computeGrowth } from './compute/computeGrowth';
import { computePeak } from './compute/computePeak';
import { computeDamageShare } from './compute/computeDamageShare';
import { computeDamageTaken } from './compute/computeDamageTaken';
import { computeHealed } from './compute/computeHealed';
import { computeGoldShare } from './compute/computeGoldShare';
// import { computeWeaknesses } from './compute/computeWeaknesses';
// import { computeAllies } from './compute/computeAllies';
// import { computeAram } from './compute/computeAram';
// import { computeSocial } from './compute/computeSocial';
// import { computeLegacy } from './compute/computeLegacy';
// import { computePathForward } from './compute/computePathForward';

export interface SceneDefinition {
  label: string;
  compute: (ctx: { puuid: string; matchIds: string[] }) => Promise<ScenePayload>;
  vizKind: VizKind;
}

export const sceneRegistry: Record<SceneId, SceneDefinition> = {
  year_in_motion: {
    label: "Year in Motion",
    compute: computeYearInMotion,
    vizKind: "heatmap"
  },
  signature_champion: {
    label: "Signature Champion",
    compute: computeSignatureChampion,
    vizKind: "radar"
  },
  damage_share: {
    label: "Damage Share",
    compute: computeDamageShare,
    vizKind: "bar"
  },
  damage_taken: {
    label: "Damage Taken",
    compute: computeDamageTaken,
    vizKind: "bar"
  },
  total_healed: {
    label: "Total Healed",
    compute: computeHealed,
    vizKind: "bar"
  },
  gold_share: {
    label: "Gold Share",
    compute: computeGoldShare,
    vizKind: "line"
  },

  growth_over_time: {
    label: "Growth Over Time",
    compute: computeGrowth,
    vizKind: "line"
  },
  peak_performance: {
    label: "Peak Performance",
    compute: computePeak,
    vizKind: "highlight"
  },
    /*
  weaknesses: {
    label: "Areas for Growth",
    compute: async () => ({ sceneId: "weaknesses", vizKind: "bar", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "bar"
  },
  allies: {
    label: "Trusted Allies",
    compute: async () => ({ sceneId: "allies", vizKind: "badge", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "badge"
  },
  aram: {
    label: "ARAM Adventures",
    compute: async () => ({ sceneId: "aram", vizKind: "infographic", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "infographic"
  },
  social_comparison: {
    label: "Among Peers",
    compute: async () => ({ sceneId: "social_comparison", vizKind: "bar", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "bar"
  },
  legacy: {
    label: "Your Legacy",
    compute: async () => ({ sceneId: "legacy", vizKind: "timeline", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "timeline"
  },
  path_forward: {
    label: "Path Forward",
    compute: async () => ({ sceneId: "path_forward", vizKind: "goal", insight: { summary: "Coming soon", details: [], action: "", metrics: [], vizData: {} } }),
    vizKind: "goal"
  } */
};

export const SCENE_ORDER: SceneId[] = [
  "year_in_motion",
  "signature_champion", 
  "damage_share",
  "damage_taken",
  "total_healed",
  "gold_share",
  // "growth_over_time",
  // "peak_performance"
  // Uncomment as these are implemented:
  // "weaknesses",
  // "allies",
  // "aram",
  // "social_comparison",
  // "legacy",
  // "path_forward"
];

export function getSceneDefinition(sceneId: SceneId): SceneDefinition {
  return sceneRegistry[sceneId];
}

export function getAllScenes(): Array<{ id: SceneId; definition: SceneDefinition }> {
  return SCENE_ORDER.map(id => ({ id, definition: sceneRegistry[id] }));
}