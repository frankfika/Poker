import { Card, Suit, Rank, HandEvaluation } from '../types';

const SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
const RANKS = [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${rank}-${suit}`
      });
    });
  });
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Simplified Hand Evaluator ---
// Maps ranks to numerical values for comparison
const rankValues: Record<Rank, number> = {
  [Rank.TWO]: 2, [Rank.THREE]: 3, [Rank.FOUR]: 4, [Rank.FIVE]: 5,
  [Rank.SIX]: 6, [Rank.SEVEN]: 7, [Rank.EIGHT]: 8, [Rank.NINE]: 9,
  [Rank.TEN]: 10, [Rank.JACK]: 11, [Rank.QUEEN]: 12, [Rank.KING]: 13, [Rank.ACE]: 14
};

export const evaluateHand = (holeCards: Card[], communityCards: Card[]): HandEvaluation => {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length === 0) return { score: 0, name: "Waiting", highCardValue: 0 };
  
  // Sort by rank descending
  allCards.sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);

  const isFlush = (cards: Card[]): boolean => {
    const counts: Record<string, number> = {};
    cards.forEach(c => counts[c.suit] = (counts[c.suit] || 0) + 1);
    return Object.values(counts).some(count => count >= 5);
  };

  const isStraight = (cards: Card[]): boolean => {
    const uniqueValues = Array.from(new Set(cards.map(c => rankValues[c.rank]))).sort((a, b) => b - a);
    let consecutive = 1;
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      if (uniqueValues[i] - uniqueValues[i+1] === 1) {
        consecutive++;
        if (consecutive >= 5) return true;
      } else {
        consecutive = 1;
      }
    }
    // Ace low straight (A, 2, 3, 4, 5)
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return true;
    }
    return false;
  };

  const getRankCounts = (cards: Card[]) => {
    const counts: Record<number, number> = {};
    cards.forEach(c => counts[rankValues[c.rank]] = (counts[rankValues[c.rank]] || 0) + 1);
    return counts;
  };

  const flush = isFlush(allCards);
  const straight = isStraight(allCards);
  const rankCounts = getRankCounts(allCards);
  const countsArr = Object.values(rankCounts).sort((a, b) => b - a);
  
  const highCardVal = rankValues[allCards[0].rank];

  // Straight Flush (Simplified check: if both true, assume high prob of SF, though technically need to check suit of straight cards)
  if (flush && straight) return { score: 800 + highCardVal, name: "Straight Flush", highCardValue: highCardVal };

  // 4 of a Kind
  if (countsArr[0] === 4) return { score: 700 + highCardVal, name: "Four of a Kind", highCardValue: highCardVal };

  // Full House
  if (countsArr[0] === 3 && countsArr[1] >= 2) return { score: 600 + highCardVal, name: "Full House", highCardValue: highCardVal };

  // Flush
  if (flush) return { score: 500 + highCardVal, name: "Flush", highCardValue: highCardVal };

  // Straight
  if (straight) return { score: 400 + highCardVal, name: "Straight", highCardValue: highCardVal };

  // 3 of a Kind
  if (countsArr[0] === 3) return { score: 300 + highCardVal, name: "Three of a Kind", highCardValue: highCardVal };

  // Two Pair
  if (countsArr[0] === 2 && countsArr[1] === 2) return { score: 200 + highCardVal, name: "Two Pair", highCardValue: highCardVal };

  // Pair
  if (countsArr[0] === 2) return { score: 100 + highCardVal, name: "Pair", highCardValue: highCardVal };

  // High Card
  return { score: highCardVal, name: "High Card", highCardValue: highCardVal };
};