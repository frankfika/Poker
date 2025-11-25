import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Player, PlayerAction } from '../types';

const getAiModel = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found, using logic fallback or dummy AI");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

interface AiDecision {
  action: PlayerAction;
  amount?: number;
  reasoning: string;
}

export const getAiDecision = async (
  gameState: GameState,
  aiPlayer: Player,
  humanPlayer: Player
): Promise<AiDecision> => {
  const ai = getAiModel();

  const prompt = `
    You are playing a heads-up game of Texas Hold'em Poker.
    
    Current Game State:
    - Phase: ${gameState.phase}
    - Pot Size: ${gameState.pot}
    - Community Cards: ${gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(', ') || 'None'}
    - Your Hand (AI): ${aiPlayer.hand.map(c => `${c.rank}${c.suit}`).join(', ')}
    - Your Chips: ${aiPlayer.chips}
    - Your Current Bet: ${aiPlayer.currentBet}
    - Opponent Chips: ${humanPlayer.chips}
    - Opponent Current Bet: ${humanPlayer.currentBet}
    - Cost to Call: ${Math.max(0, humanPlayer.currentBet - aiPlayer.currentBet)}
    
    Opponent Actions History: This is a simplified stateless request, judge based on board texture and hand strength.
    
    Decide your move:
    1. FOLD: If chances are very low.
    2. CHECK: If cost to call is 0.
    3. CALL: To match opponent bet.
    4. RAISE: To increase the stakes. If raising, specify amount.
    
    Return JSON format only.
  `;

  if (!ai) {
    // Fallback simple logic if no API key
    return { action: PlayerAction.CHECK, reasoning: "AI Offline Mode" };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: [PlayerAction.FOLD, PlayerAction.CHECK, PlayerAction.CALL, PlayerAction.RAISE] },
            amount: { type: Type.INTEGER },
            reasoning: { type: Type.STRING }
          },
          required: ["action", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Safety check for valid action relative to game state
    let safeAction = result.action;
    const callCost = humanPlayer.currentBet - aiPlayer.currentBet;
    
    if (callCost > 0 && safeAction === PlayerAction.CHECK) safeAction = PlayerAction.FOLD; // Cannot check if there is a bet
    if (callCost === 0 && safeAction === PlayerAction.FOLD) safeAction = PlayerAction.CHECK; // Don't fold for free

    return {
      action: safeAction,
      amount: result.amount || gameState.minBet * 2,
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return { action: PlayerAction.CHECK, reasoning: "Hmm, I'm thinking..." };
  }
};