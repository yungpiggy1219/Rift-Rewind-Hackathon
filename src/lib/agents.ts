import { AgentId, AgentPersona, NarrationRequest, NarrationResponse, SceneInsight } from './types';

export const AGENTS: Record<AgentId, AgentPersona> = {
  velkoz: {
    id: "velkoz",
    name: "Vel'Koz",
    title: "The Eye of the Void",
    personality: "Analytical, clinical, obsessed with knowledge and data",
    tone: "Scientific, precise, slightly condescending",
    catchphrases: ["Knowledge through disintegration", "Fascinating specimen", "The data reveals"],
    voiceStyle: "Uses technical terms, references research and analysis, speaks like a scientist studying specimens"
  },
  teemo: {
    id: "teemo",
    name: "Teemo",
    title: "The Swift Scout",
    personality: "Cheerful, encouraging, but with hidden mischief",
    tone: "Upbeat, supportive, occasionally sassy",
    catchphrases: ["Captain Teemo on duty!", "Size doesn't mean everything!", "Never underestimate the power of the Scout's Code!"],
    voiceStyle: "Enthusiastic and positive, uses military/scout terminology, occasionally drops hints of his darker side"
  },
  heimer: {
    id: "heimer",
    name: "Heimerdinger",
    title: "The Revered Inventor",
    personality: "Wise, professorial, loves to teach and explain",
    tone: "Academic, patient, slightly verbose",
    catchphrases: ["Eureka!", "Indeed, a wise choice", "Science is so amazing!"],
    voiceStyle: "Speaks like a professor, uses scientific explanations, patient and educational"
  },
  kayle: {
    id: "kayle",
    name: "Kayle",
    title: "The Righteous",
    personality: "Judgmental, righteous, focused on improvement and justice",
    tone: "Authoritative, moral, inspiring but stern",
    catchphrases: ["Justice takes wing", "Into the fray!", "Weakness is a choice"],
    voiceStyle: "Speaks with divine authority, focuses on judgment and improvement, inspirational but demanding"
  },
  draven: {
    id: "draven",
    name: "Draven",
    title: "The Glorious Executioner",
    personality: "Narcissistic, dramatic, obsessed with glory and spectacle",
    tone: "Boastful, theatrical, self-aggrandizing",
    catchphrases: ["Welcome to the League of Draven!", "Draven does it all!", "It's all skill!"],
    voiceStyle: "Everything is about Draven, dramatic flair, treats everything like a performance"
  }
};

export function buildNarration(request: NarrationRequest): NarrationResponse {
  const agent = AGENTS[request.agentId];
  const { insight, playerName = "Summoner" } = request;
  
  // Extract key metrics for narration
  const primaryMetric = insight.metrics[0];
  const secondaryMetrics = insight.metrics.slice(1, 3);
  
  switch (request.agentId) {
    case "velkoz":
      return {
        title: `Analysis: ${insight.summary}`,
        opening: `Fascinating. My ocular sensors have completed their analysis of specimen "${playerName}". The data reveals intriguing patterns in your performance matrix.`,
        analysis: `Through rigorous examination, I observe: ${insight.summary}. The primary data point indicates ${primaryMetric?.label}: ${primaryMetric?.value}${primaryMetric?.unit || ''}. ${insight.details.join(' ')} This behavioral pattern suggests ${insight.action.toLowerCase()}.`,
        actionable: `For optimal performance enhancement, I recommend: ${insight.action}. Knowledge through disintegration has shown this approach yields superior results.`,
        tags: ["analytical", "scientific", "void"]
      };
      
    case "teemo":
      return {
        title: `Scout Report: ${insight.summary}!`,
        opening: `Captain Teemo reporting! I've been keeping an eye on your performance, ${playerName}, and I've got some exciting intel to share!`,
        analysis: `Here's what this swift scout discovered: ${insight.summary}! Your ${primaryMetric?.label} of ${primaryMetric?.value}${primaryMetric?.unit || ''} shows you're really stepping up your game! ${insight.details.join(' ')} Size doesn't mean everything - it's all about heart!`,
        actionable: `My scout's recommendation? ${insight.action}! Remember, never underestimate the power of the Scout's Code. You've got this, champion!`,
        tags: ["encouraging", "military", "scout"]
      };
      
    case "heimer":
      return {
        title: `Academic Analysis: ${insight.summary}`,
        opening: `Ah, greetings ${playerName}! Professor Heimerdinger here. I've been conducting a thorough study of your gameplay patterns, and the results are quite illuminating!`,
        analysis: `Through careful observation and statistical analysis, I've determined: ${insight.summary}. Your ${primaryMetric?.label} measurement of ${primaryMetric?.value}${primaryMetric?.unit || ''} demonstrates fascinating behavioral trends. ${insight.details.join(' ')} Science is so amazing when applied to competitive analysis!`,
        actionable: `My academic recommendation is clear: ${insight.action}. Indeed, this approach has been proven effective through extensive research. Eureka - knowledge is power!`,
        tags: ["academic", "scientific", "professorial"]
      };
      
    case "kayle":
      return {
        title: `Divine Judgment: ${insight.summary}`,
        opening: `${playerName}, I have observed your trials upon the Rift. Justice demands truth, and truth reveals both strength and areas requiring purification.`,
        analysis: `My judgment reveals: ${insight.summary}. Your ${primaryMetric?.label} stands at ${primaryMetric?.value}${primaryMetric?.unit || ''} - a measure of your current state. ${insight.details.join(' ')} Weakness is a choice, and you have the power to transcend your limitations.`,
        actionable: `The path to righteousness is clear: ${insight.action}. Into the fray with purpose and determination. Justice takes wing when you commit to improvement.`,
        tags: ["righteous", "divine", "judgment"]
      };
      
    case "draven":
      return {
        title: `The Draven Show: ${insight.summary}!`,
        opening: `Welcome to the League of Draven! That's right, ${playerName}, you're now part of the most glorious performance on the Rift!`,
        analysis: `Draven has analyzed your performance, and here's what the star of the show discovered: ${insight.summary}! Your ${primaryMetric?.label} of ${primaryMetric?.value}${primaryMetric?.unit || ''} shows you're learning from the master! ${insight.details.join(' ')} It's all skill, baby!`,
        actionable: `Draven's expert advice? ${insight.action}! Follow the Draven way and you'll be catching axes and glory in no time. Draven does it all, and now you can too!`,
        tags: ["dramatic", "glorious", "performance"]
      };
      
    default:
      return {
        title: insight.summary,
        opening: `Analysis complete for ${playerName}.`,
        analysis: `${insight.summary}. ${insight.details.join(' ')}`,
        actionable: insight.action,
        tags: ["neutral"]
      };
  }
}

// TODO: Replace with real LLM integration
// This is where you would integrate with OpenAI, Anthropic, or AWS Bedrock
// Example integration point:
/*
export async function generateLLMNarration(request: NarrationRequest): Promise<NarrationResponse> {
  const agent = AGENTS[request.agentId];
  const prompt = `You are ${agent.name}, ${agent.title}. ${agent.personality}. 
    Tone: ${agent.tone}. 
    Analyze this League of Legends performance data and respond in character:
    ${JSON.stringify(request.insight)}`;
    
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4",
  //   messages: [{ role: "user", content: prompt }],
  // });
  
  // return parseResponse(response.choices[0].message.content);
}
*/