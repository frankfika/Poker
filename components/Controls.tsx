import React from 'react';
import { PlayerAction } from '../types';

interface ControlsProps {
  onAction: (action: PlayerAction, amount?: number) => void;
  canCheck: boolean;
  minRaise: number;
  maxBet: number;
  disabled: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ onAction, canCheck, minRaise, maxBet, disabled }) => {
  return (
    <div className={`fixed bottom-0 left-0 w-full bg-gradient-to-t from-black to-gray-900/90 p-4 border-t border-gray-700 flex flex-col items-center justify-center gap-4 z-50 transition-transform duration-300 ${disabled ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      
      <div className="flex gap-2 w-full max-w-2xl justify-center">
        <button
          onClick={() => onAction(PlayerAction.FOLD)}
          className="flex-1 bg-red-900 hover:bg-red-800 text-red-100 font-bold py-3 rounded-lg border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider"
        >
          Fold
        </button>
        
        {canCheck ? (
          <button
            onClick={() => onAction(PlayerAction.CHECK)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction(PlayerAction.CALL)}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider"
          >
            Call
          </button>
        )}

        <button
          onClick={() => onAction(PlayerAction.RAISE, minRaise)}
          className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-yellow-950 font-bold py-3 rounded-lg border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider"
        >
          Raise ${minRaise}
        </button>
      </div>
    </div>
  );
};