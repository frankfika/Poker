export enum Suit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades'
}

export enum Rank {
  TWO = '2', THREE = '3', FOUR = '4', FIVE = '5', SIX = '6', SEVEN = '7',
  EIGHT = '8', NINE = '9', TEN = '10', JACK = 'J', QUEEN = 'Q', KING = 'K', ACE = 'A'
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique identifier for React keys
}

export enum GamePhase {
  PRE_FLOP = 'Pre-Flop',
  FLOP = 'Flop',
  TURN = 'Turn',
  RIVER = 'River',
  SHOWDOWN = 'Showdown',
  GAME_OVER = 'Game Over'
}

export enum PlayerAction {
  FOLD = 'Fold',
  CHECK = 'Check',
  CALL = 'Call',
  RAISE = 'Raise',
  ALL_IN = 'All-In'
}

export interface Player {
  id: string;
  name: string;
  isAi: boolean;
  hand: Card[];
  chips: number;
  currentBet: number; // Bet in the current round
  hasFolded: boolean;
  isDealer: boolean;
  avatarUrl: string;
  lastAction?: string;
  actionReasoning?: string; // For AI thought bubble
}

export interface GameState {
  deck: Card[];
  communityCards: Card[];
  pot: number;
  phase: GamePhase;
  currentPlayerId: string;
  dealerId: string;
  players: Player[];
  minBet: number;
  message: string;
  winnerIds: string[];
}

export interface HandEvaluation {
  score: number;
  name: string; // e.g., "Full House"
  highCardValue: number;
}