import React, { useState, useEffect, useCallback } from 'react';
import { Card as CardType, GamePhase, GameState, Player, PlayerAction, Suit, Rank, HandEvaluation } from './types';
import { createDeck, evaluateHand } from './services/pokerLogic';
import { getAiDecision } from './services/geminiService';
import { Card } from './components/Card';
import { Player as PlayerComponent } from './components/Player';
import { Controls } from './components/Controls';

const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    communityCards: [],
    pot: 0,
    phase: GamePhase.GAME_OVER,
    currentPlayerId: '',
    dealerId: 'p1', // Dealer button moves
    players: [],
    minBet: BIG_BLIND,
    message: "Welcome to Gemini Poker",
    winnerIds: []
  });

  const [aiThinking, setAiThinking] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  // Initialize Game
  const startNewGame = useCallback(() => {
    const deck = createDeck();
    
    // Deal Hole Cards
    const p1Hand = [deck.pop()!, deck.pop()!];
    const p2Hand = [deck.pop()!, deck.pop()!];

    // Reset players or Create if first time
    const player1: Player = {
      id: 'p1',
      name: 'You',
      isAi: false,
      hand: p1Hand,
      chips: gameState.players.length > 0 ? gameState.players[0].chips : INITIAL_CHIPS,
      currentBet: 0,
      hasFolded: false,
      isDealer: gameState.dealerId === 'p1', // Rotate for next hand logic simplified here
      avatarUrl: 'https://picsum.photos/id/64/100/100',
      lastAction: undefined
    };

    const player2: Player = {
      id: 'p2',
      name: 'Gemini AI',
      isAi: true,
      hand: p2Hand,
      chips: gameState.players.length > 0 ? gameState.players[1].chips : INITIAL_CHIPS,
      currentBet: 0,
      hasFolded: false,
      isDealer: gameState.dealerId === 'p2',
      avatarUrl: 'https://picsum.photos/id/237/100/100', // Dog picture for fun
      lastAction: undefined,
      actionReasoning: undefined
    };

    // Determine Blinds and First Actor
    // If P1 is dealer, P2 is SB, P1 is BB (Heads up rules are weird, sticking to simple: Dealer is SB in heads up usually, but lets do Dealer = Button. SB left of button, BB left of SB)
    // Heads up: Dealer is SB, Opponent is BB. Dealer acts first Pre-flop.
    
    const dealerIsP1 = gameState.dealerId === 'p1';
    const sbPlayer = dealerIsP1 ? player1 : player2;
    const bbPlayer = dealerIsP1 ? player2 : player1;

    sbPlayer.chips -= SMALL_BLIND;
    sbPlayer.currentBet = SMALL_BLIND;
    
    bbPlayer.chips -= BIG_BLIND;
    bbPlayer.currentBet = BIG_BLIND;

    const pot = SMALL_BLIND + BIG_BLIND;
    const firstActorId = sbPlayer.id; // SB acts first pre-flop in heads up

    setGameState({
      deck,
      communityCards: [],
      pot,
      phase: GamePhase.PRE_FLOP,
      currentPlayerId: firstActorId,
      dealerId: gameState.dealerId === 'p1' ? 'p2' : 'p1', // Swap dealer for next game reference, but applying strictly for this game logic
      players: dealerIsP1 ? [player1, player2] : [player2, player1], // Re-order not necessary but keeping consistent index helps
      minBet: BIG_BLIND,
      message: "Pre-Flop: Place your bets.",
      winnerIds: []
    });
    setShowWinnerModal(false);
  }, [gameState.dealerId, gameState.players]);

  // Initial load
  useEffect(() => {
    // Only run once on mount to set initial "Ready" state
    if (gameState.players.length === 0) {
        setGameState(prev => ({...prev, message: "Press 'Deal' to start"}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game Flow & AI Logic ---

  const handlePhaseChange = (newState: GameState) => {
    const { phase, deck, communityCards, players, pot } = newState;
    let nextPhase = phase;
    let newCommunityCards = [...communityCards];
    let newDeck = [...deck];
    
    // If current betting round is done (checked by logic inside handleAction, triggering this)
    // We deal cards.
    
    if (phase === GamePhase.PRE_FLOP) {
      nextPhase = GamePhase.FLOP;
      // Burn 1 (simulated by just popping)
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!, newDeck.pop()!, newDeck.pop()!);
    } else if (phase === GamePhase.FLOP) {
      nextPhase = GamePhase.TURN;
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!);
    } else if (phase === GamePhase.TURN) {
      nextPhase = GamePhase.RIVER;
      newDeck.pop();
      newCommunityCards.push(newDeck.pop()!);
    } else if (phase === GamePhase.RIVER) {
      nextPhase = GamePhase.SHOWDOWN;
    }

    // Reset bets for new round
    const updatedPlayers = players.map(p => ({ ...p, currentBet: 0, lastAction: undefined }));
    
    // Set First actor (Non-dealer acts first post-flop in heads up)
    // Actually, normally BB acts first post-flop.
    // Heads up: Dealer is SB. BB is opponent. BB acts first post flop.
    // DealerId in state is the one who WAS dealer this hand.
    const actingFirstId = newState.dealerId === 'p1' ? 'p2' : 'p1';

    if (nextPhase === GamePhase.SHOWDOWN) {
      determineWinner(updatedPlayers, newCommunityCards, pot);
    } else {
      setGameState({
        ...newState,
        deck: newDeck,
        communityCards: newCommunityCards,
        phase: nextPhase,
        players: updatedPlayers,
        currentPlayerId: actingFirstId,
        message: `${nextPhase} dealt.`
      });
    }
  };

  const determineWinner = (players: Player[], communityCards: CardType[], pot: number) => {
    const activePlayers = players.filter(p => !p.hasFolded);
    
    if (activePlayers.length === 1) {
      // Everyone folded
      const winner = activePlayers[0];
      endRound([winner.id], pot, `${winner.name} wins (Opponent folded)`);
      return;
    }

    // Evaluate hands
    const p1Eval = evaluateHand(players.find(p => p.id === 'p1')!.hand, communityCards);
    const p2Eval = evaluateHand(players.find(p => p.id === 'p2')!.hand, communityCards);

    let winnerIds: string[] = [];
    let message = '';

    if (p1Eval.score > p2Eval.score) {
      winnerIds = ['p1'];
      message = `You win with ${p1Eval.name}!`;
    } else if (p2Eval.score > p1Eval.score) {
      winnerIds = ['p2'];
      message = `Gemini wins with ${p2Eval.name}!`;
    } else {
      winnerIds = ['p1', 'p2'];
      message = `Split Pot! Both have ${p1Eval.name}.`;
    }

    endRound(winnerIds, pot, message);
  };

  const endRound = (winnerIds: string[], pot: number, message: string) => {
    setGameState(prev => {
        const updatedPlayers = prev.players.map(p => {
            if (winnerIds.includes(p.id)) {
                return { ...p, chips: p.chips + (pot / winnerIds.length) };
            }
            return p;
        });

        return {
            ...prev,
            players: updatedPlayers,
            pot: 0,
            phase: GamePhase.GAME_OVER,
            currentPlayerId: '',
            message,
            winnerIds
        };
    });
    setShowWinnerModal(true);
  };

  const handleAction = async (action: PlayerAction, amount: number = 0) => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    if (!currentPlayer) return;

    let newPot = gameState.pot;
    let phaseChangeNeeded = false;
    let nextPlayerId = gameState.players.find(p => p.id !== currentPlayer.id)!.id;

    const updatedPlayers = gameState.players.map(p => {
        if (p.id !== currentPlayer.id) return p;

        // Logic for chips and bets
        const opponent = gameState.players.find(o => o.id !== p.id)!;
        let betAmount = 0;

        if (action === PlayerAction.FOLD) {
            return { ...p, hasFolded: true, lastAction: PlayerAction.FOLD };
        } else if (action === PlayerAction.CHECK) {
            return { ...p, lastAction: PlayerAction.CHECK };
        } else if (action === PlayerAction.CALL) {
            const toCall = opponent.currentBet - p.currentBet;
            betAmount = toCall;
            newPot += betAmount;
            return { ...p, chips: p.chips - betAmount, currentBet: p.currentBet + betAmount, lastAction: PlayerAction.CALL };
        } else if (action === PlayerAction.RAISE) {
            const totalBet = opponent.currentBet + amount; // Simple raise logic (raise BY amount over opponent)
            betAmount = totalBet - p.currentBet;
            newPot += betAmount;
            return { ...p, chips: p.chips - betAmount, currentBet: totalBet, lastAction: PlayerAction.RAISE };
        }
        return p;
    });

    const didFold = action === PlayerAction.FOLD;
    
    // Determine if round ends
    // Round ends if:
    // 1. Player Folded -> Instant Game Over
    // 2. Both checked (Big blind option pre-flop special case ignored for simplicity) or 
    // 3. One called the other's bet/raise.
    
    const p1 = updatedPlayers.find(p => p.id === 'p1')!;
    const p2 = updatedPlayers.find(p => p.id === 'p2')!;

    if (didFold) {
         determineWinner(updatedPlayers, gameState.communityCards, newPot);
         return;
    }

    const betsEqual = p1.currentBet === p2.currentBet;
    
    // Check if betting round is over
    // If bets are equal and both have acted at least once in this phase...
    // Or if everyone checked (bets equal 0)
    
    // Flag to track if we move to next street
    // If current action was CHECK and opponent also checked -> Next Street
    // If current action was CALL -> Next Street (since bets are matched)
    
    // NOTE: Pre-flop is special. SB posts, BB posts. SB calls (match BB). BB can Check. 
    // If bets are equal and it wasn't just the blinds posting... 
    // Logic simplified: If bets are equal and stack > 0, we proceed.
    
    if (betsEqual && action !== PlayerAction.RAISE && p1.currentBet > 0) {
        // If it was a call or a check-back
        phaseChangeNeeded = true;
    } else if (betsEqual && action === PlayerAction.CHECK && gameState.phase !== GamePhase.PRE_FLOP) {
         phaseChangeNeeded = true;
    } else if (action === PlayerAction.CHECK && p1.currentBet === p2.currentBet && p1.currentBet === 0) {
        // P1 check, P2 check
        if (currentPlayer.id === (gameState.dealerId === 'p1' ? 'p2' : 'p1')) { 
            // If the second actor checks, round over
            phaseChangeNeeded = true;
        }
    }

    if (phaseChangeNeeded) {
        handlePhaseChange({
            ...gameState,
            players: updatedPlayers,
            pot: newPot
        });
    } else {
        // Switch turn
        setGameState({
            ...gameState,
            players: updatedPlayers,
            pot: newPot,
            currentPlayerId: nextPlayerId,
            message: `${nextPlayerId === 'p1' ? "Your" : "AI"} turn.`
        });
    }
  };

  // AI Trigger
  useEffect(() => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    
    if (gameState.phase !== GamePhase.GAME_OVER && 
        gameState.phase !== GamePhase.SHOWDOWN && 
        currentPlayer && 
        currentPlayer.isAi && 
        !aiThinking) {
      
      const performAiTurn = async () => {
        setAiThinking(true);
        const human = gameState.players.find(p => !p.isAi)!;
        
        // Artificial delay for realism
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        
        const decision = await getAiDecision(gameState, currentPlayer, human);
        
        // Update state with reasoning for UI
        setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === currentPlayer.id ? {...p, actionReasoning: decision.reasoning} : p)
        }));

        // Execute action
        // Short delay to let user read reasoning
        await new Promise(r => setTimeout(r, 1500));
        
        handleAction(decision.action, decision.amount);
        setAiThinking(false);
      };

      performAiTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayerId, gameState.phase]);


  // Rendering Helpers
  const humanPlayer = gameState.players.find(p => p.id === 'p1');
  const aiPlayer = gameState.players.find(p => p.id === 'p2');
  const isPlayerTurn = gameState.currentPlayerId === 'p1' && gameState.phase !== GamePhase.GAME_OVER;

  const currentOpponentBet = aiPlayer ? aiPlayer.currentBet : 0;
  const myBet = humanPlayer ? humanPlayer.currentBet : 0;
  const toCall = currentOpponentBet - myBet;
  const canCheck = toCall === 0;

  return (
    <div className="min-h-screen bg-poker-green felt-texture flex flex-col items-center relative overflow-hidden font-sans">
        {/* Header */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-black/30 z-10">
            <h1 className="text-poker-gold font-bold text-xl tracking-widest uppercase">Gemini Hold'em</h1>
            <div className="bg-black/50 px-4 py-2 rounded-lg text-white font-mono border border-gray-600">
                POT: <span className="text-yellow-400 text-lg">${gameState.pot}</span>
            </div>
            <button 
                onClick={startNewGame} 
                className="bg-poker-red hover:bg-red-700 text-white px-4 py-1 rounded text-sm font-bold uppercase transition"
                disabled={gameState.phase !== GamePhase.GAME_OVER}
            >
                {gameState.players.length === 0 ? "Start Game" : "New Hand"}
            </button>
        </div>

        {/* Game Table Area */}
        <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-4 relative my-16">
            
            {/* AI Player (Top) */}
            {aiPlayer && (
                <div className="mb-8">
                    <PlayerComponent 
                        player={aiPlayer} 
                        isActive={gameState.currentPlayerId === aiPlayer.id}
                        isWinner={gameState.winnerIds.includes(aiPlayer.id)}
                    />
                </div>
            )}

            {/* Community Cards & Info */}
            <div className="w-full flex flex-col items-center justify-center space-y-4 my-4 min-h-[160px]">
                 <div className="text-white/70 font-bold uppercase tracking-widest text-sm mb-2">
                    {gameState.phase}
                 </div>
                 
                 <div className="flex space-x-2 md:space-x-4">
                    {gameState.communityCards.map((card, i) => (
                        <Card key={card.id} card={card} className="animate-fade-in-up" />
                    ))}
                    {[...Array(5 - gameState.communityCards.length)].map((_, i) => (
                         <div key={`placeholder-${i}`} className="w-16 h-24 md:w-20 md:h-28 border-2 border-white/10 rounded-lg bg-black/20"></div>
                    ))}
                 </div>

                 {gameState.message && (
                     <div className="bg-black/60 px-6 py-2 rounded-full text-white font-semibold backdrop-blur-md animate-pulse">
                        {gameState.message}
                     </div>
                 )}
            </div>

            {/* Human Player (Bottom) */}
            {humanPlayer && (
                <div className="mt-8">
                    <PlayerComponent 
                        player={humanPlayer} 
                        isActive={gameState.currentPlayerId === humanPlayer.id}
                        isWinner={gameState.winnerIds.includes(humanPlayer.id)}
                    />
                </div>
            )}
        </div>

        {/* Winner Modal */}
        {showWinnerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-gray-900 border-2 border-poker-gold p-8 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
                    <div className="text-5xl text-poker-gold mb-4">
                        <i className="fas fa-trophy"></i>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{gameState.message}</h2>
                    <p className="text-gray-400 mb-6">Pot Won: <span className="text-yellow-400 font-bold">${gameState.pot}</span></p>
                    <button 
                        onClick={startNewGame}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 rounded-lg uppercase tracking-wider transform transition hover:scale-105"
                    >
                        Deal Next Hand
                    </button>
                </div>
            </div>
        )}

        {/* Controls */}
        <Controls 
            onAction={handleAction} 
            canCheck={canCheck}
            minRaise={Math.max(BIG_BLIND, (currentOpponentBet - myBet) * 2)}
            maxBet={humanPlayer ? humanPlayer.chips : 0}
            disabled={!isPlayerTurn}
        />

        {/* Styles injection for animations */}
        <style>{`
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
                animation: fadeInUp 0.5s ease-out forwards;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fadeIn 0.3s ease-out forwards;
            }
            .bg-pattern {
                background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 8px);
            }
        `}</style>
    </div>
  );
};

export default App;