import React from 'react';
import { Player as PlayerType, Card as CardType } from '../types';
import { Card } from './Card';

interface PlayerProps {
  player: PlayerType;
  isActive: boolean;
  isWinner?: boolean;
}

export const Player: React.FC<PlayerProps> = ({ player, isActive, isWinner }) => {
  return (
    <div className={`relative flex flex-col items-center transition-opacity duration-300 ${player.hasFolded ? 'opacity-50 grayscale' : 'opacity-100'}`}>
      
      {/* AI Thought Bubble */}
      {player.isAi && player.actionReasoning && !player.hasFolded && (
        <div className="absolute -top-24 w-64 bg-white text-gray-800 p-3 rounded-lg shadow-xl text-xs z-20 animate-fade-in border-l-4 border-poker-gold">
          <p className="font-semibold mb-1 text-poker-green">AI Thought:</p>
          "{player.actionReasoning}"
          <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
        </div>
      )}

      {/* Cards */}
      <div className="flex -space-x-4 mb-2 relative z-10">
        {player.hand.map((card, idx) => (
          <div key={idx} className={idx === 1 ? 'transform rotate-6 translate-y-1' : 'transform -rotate-6'}>
            <Card card={card} hidden={player.isAi && !isWinner /* Show AI cards only if winner at showdown */} />
          </div>
        ))}
      </div>

      {/* Avatar & Info */}
      <div className={`relative flex items-center space-x-3 bg-gray-900/90 backdrop-blur-sm p-3 rounded-full border-2 min-w-[200px] shadow-lg
        ${isActive ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-gray-600'}
        ${isWinner ? 'border-green-400 ring-4 ring-green-400/50 scale-110' : ''}
      `}>
        <div className="relative">
            <img 
            src={player.avatarUrl} 
            alt={player.name} 
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
            />
            {player.isDealer && (
                <div className="absolute -bottom-1 -right-1 bg-white text-black font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-gray-400 shadow-sm">
                    D
                </div>
            )}
        </div>
        
        <div className="flex flex-col">
          <span className="font-bold text-white text-sm">{player.name}</span>
          <span className="text-yellow-400 font-mono text-sm flex items-center">
            <i className="fas fa-coins mr-1"></i> ${player.chips}
          </span>
        </div>

        {/* Action Badge */}
        {player.lastAction && (
             <div className="absolute -right-4 -top-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full uppercase shadow-md border border-blue-400 animate-bounce">
                {player.lastAction}
             </div>
        )}
      </div>

      {/* Current Bet on Table */}
      {player.currentBet > 0 && (
          <div className="mt-2 flex items-center justify-center bg-black/60 px-3 py-1 rounded-full text-white font-mono text-sm border border-yellow-500/30">
             <i className="fas fa-arrow-up mr-1 text-yellow-500"></i> ${player.currentBet}
          </div>
      )}
    </div>
  );
};