import { SceneId, ScenePayload, VizKind } from './types';
import { computeYearInMotion } from './compute/computeYearInMotion';
import { computeSignatureStyle } from './compute/computeSignatureStyle';
import { computeGrowth } from './compute/computeGrowth';
import { computePeak } from './compute/computePeak';
import { computeWeaknesses } from './compute/computeWeaknesses';
import { computeAllies } from './compute/computeAllies';
import { computeAram } from './compute/computeAram';
import { computeSocial } from './compute/computeSocial';
import { computeLegacy } from './compute/computeLegacy';
import { computePathForward } from './compute/computePathForward';

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
  signature_style: {
    label: "Signature Style",
    compute: computeSignatureStyle,
    vizKind: "radar"
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
  weaknesses: {
    label: "Areas for Growth",
    compute: computeWeaknesses,
    vizKind: "bar"
  },
  allies: {
    label: "Trusted Allies",
    compute: computeAllies,
    vizKind: "badge"
  },
  aram: {
    label: "ARAM Adventures",
    compute: computeAram,
    vizKind: "infographic"
  },
  social_comparison: {
    label: "Among Peers",
    compute: computeSocial,
    vizKind: "bar"
  },
  legacy: {
    label: "Your Legacy",
    compute: computeLegacy,
    vizKind: "highlight"
  },
  path_forward: {
    label: "Path Forward",
    compute: computePathForward,
    vizKind: "goal"
  }
};

export const SCENE_ORDER: SceneId[] = [
  "year_in_motion",
  "signature_style", 
  "growth_over_time",
  "peak_performance",
  "weaknesses",
  "allies",
  "aram",
  "social_comparison",
  "legacy",
  "path_forward"
];

export function getSceneDefinition(sceneId: SceneId): SceneDefinition {
  return sceneRegistry[sceneId];
}

export function getAllScenes(): Array<{ id: SceneId; definition: SceneDefinition }> {
  return SCENE_ORDER.map(id => ({ id, definition: sceneRegistry[id] }));
}