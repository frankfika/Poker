import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
}

const suitIcons: Record<Suit, string> = {
  [Suit.HEARTS]: '♥',
  [Suit.DIAMONDS]: '♦',
  [Suit.CLUBS]: '♣',
  [Suit.SPADES]: '♠'
};

const suitColors: Record<Suit, string> = {
  [Suit.HEARTS]: 'text-red-600',
  [Suit.DIAMONDS]: 'text-red-600',
  [Suit.CLUBS]: 'text-black',
  [Suit.SPADES]: 'text-black'
};

export const Card: React.FC<CardProps> = ({ card, hidden = false, className = '' }) => {
  if (hidden || !card) {
    return (
      <div className={`w-16 h-24 md:w-20 md:h-28 bg-blue-900 border-2 border-white rounded-lg shadow-md flex items-center justify-center relative bg-pattern ${className}`}>
        <div className="absolute inset-2 border border-blue-400 opacity-30 rounded-md"></div>
        <div className="bg-white w-8 h-12 rounded-full opacity-10 transform rotate-45"></div>
      </div>
    );
  }

  return (
    <div className={`w-16 h-24 md:w-20 md:h-28 bg-white rounded-lg shadow-lg flex flex-col justify-between p-1 md:p-2 border border-gray-300 relative select-none transition-transform hover:-translate-y-1 ${className}`}>
      <div className={`text-sm md:text-lg font-bold leading-none ${suitColors[card.suit]}`}>
        {card.rank}
        <div className="text-xs">{suitIcons[card.suit]}</div>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center text-4xl md:text-5xl ${suitColors[card.suit]}`}>
        {suitIcons[card.suit]}
      </div>

      <div className={`text-sm md:text-lg font-bold leading-none self-end transform rotate-180 ${suitColors[card.suit]}`}>
        {card.rank}
        <div className="text-xs">{suitIcons[card.suit]}</div>
      </div>
    </div>
  );
};