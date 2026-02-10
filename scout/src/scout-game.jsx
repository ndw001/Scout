import React, { useState, useEffect } from 'react';
import { Shuffle, RotateCw, Trophy, ArrowUp, ArrowDown } from 'lucide-react';

// Scout Card Game - Single Player vs AI
// Rules: Players try to play sets of cards (consecutive or matching ranks)
// You can either Scout (take a card from opponent's play) or Show (play your own cards)

const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const ScoutGame = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing, roundEnd, gameEnd
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHands, setAiHands] = useState([[], [], []]);
  const [currentPlay, setCurrentPlay] = useState(null);
  const [playedBy, setPlayedBy] = useState(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScores, setAiScores] = useState([0, 0, 0]);
  const [roundScores, setRoundScores] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [canScout, setCanScout] = useState(true);
  const [message, setMessage] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // 0 = human, 1-3 = AI
  const [animating, setAnimating] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [moveLog, setMoveLog] = useState([]);
  const [gamePhase, setGamePhase] = useState('orientHand'); // 'orientHand' | 'playing'
  const [pendingScout, setPendingScout] = useState(null); // { card } while awaiting placement

  const logMove = (playerName, action, detail) => {
    setMoveLog(prev => [...prev, { playerName, action, detail, id: Date.now() }]);
  };

  // Create a deck of cards (4 copies of each rank, no suits)
  const createDeck = () => {
    const deck = [];
    RANKS.forEach((rank, idx) => {
      for (let copy = 0; copy < 4; copy++) {
        deck.push({
          rank,
          value: idx + 1,
          id: `${rank}-${copy}`,
          flipped: false
        });
      }
    });
    return deck;
  };

  // Shuffle deck
  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Start a new round
  const startRound = (players) => {
    const deck = shuffleDeck(createDeck());
    const handSize = 9;
    setPlayerHand(deck.slice(0, handSize));
    
    const playerCount = players || numPlayers;
    const newAiHands = [];
    for (let i = 0; i < playerCount - 1; i++) {
      newAiHands.push(deck.slice(handSize * (i + 1), handSize * (i + 2)));
    }
    setAiHands(newAiHands);
    
    setCurrentPlay(null);
    setPlayedBy(null);
    setSelectedCards([]);
    setCanScout(true);
    setMessage('Flip any cards to set which value is active, then click Start Round');
    setCurrentPlayerIndex(0);
    setGameState('playing');
    setGamePhase('orientHand');
    setLastAction('');
    setMoveLog([]);
    setPendingScout(null);
  };

  // Start a new game
  const startGame = (rounds, players) => {
    setTotalRounds(rounds);
    setNumPlayers(players);
    setCurrentRound(1);
    setPlayerScore(0);
    setAiScores([0, 0, 0]);
    setRoundScores([]);
    startRound(players);
  };

  // Check if cards form a valid play
  const isValidPlay = (cards) => {
    if (cards.length === 0) return false;
    if (cards.length === 1) return true;

    // Check if all same rank
    const allSameRank = cards.every(c => c.rank === cards[0].rank);
    if (allSameRank) return true;

    // Check if consecutive
    const sortedValues = cards.map(c => c.value).sort((a, b) => a - b);
    const isConsecutive = sortedValues.every((val, idx) => 
      idx === 0 || val === sortedValues[idx - 1] + 1
    );
    
    return isConsecutive;
  };

  // Check if new play beats current play
  const beatsCurrentPlay = (newCards) => {
    if (!currentPlay) return true;
    if (newCards.length !== currentPlay.cards.length) return false;

    const newMax = Math.max(...newCards.map(c => c.value));
    const currentMax = Math.max(...currentPlay.cards.map(c => c.value));
    
    return newMax > currentMax;
  };

  // Calculate hand score
  const calculateHandScore = (hand) => {
    return hand.reduce((sum, card) => sum + card.value, 0);
  };

  // Handle card selection
  const toggleCardSelection = (cardId) => {
    if (animating || currentPlayerIndex !== 0) return;
    
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  // Flip a card
  const flipCard = (cardId) => {
    if (animating || currentPlayerIndex !== 0) return;
    
    setPlayerHand(prev => prev.map(card => 
      card.id === cardId ? { ...card, flipped: !card.flipped } : card
    ));
  };

  // Player shows cards
  const handleShow = () => {
    if (animating || currentPlayerIndex !== 0) return;
    
    const cardsToPlay = playerHand.filter(c => selectedCards.includes(c.id));
    
    if (!isValidPlay(cardsToPlay)) {
      setMessage('Invalid play! Cards must be consecutive or matching ranks.');
      return;
    }

    if (!beatsCurrentPlay(cardsToPlay)) {
      setMessage('Your play must beat the current play!');
      return;
    }

    setAnimating(true);
    setCurrentPlay({ cards: cardsToPlay, type: 'show' });
    setPlayedBy(0);
    setPlayerHand(prev => prev.filter(c => !selectedCards.includes(c.id)));
    setSelectedCards([]);
    setCanScout(false);
    setLastAction('show');
    setMessage('You played cards!');
    logMove('You', 'showed', cardsToPlay.map(c => c.rank).join(', '));

    setTimeout(() => {
      setAnimating(false);
      if (playerHand.length - cardsToPlay.length === 0) {
        endRound(0);
      } else {
        nextPlayer(0);
      }
    }, 500);
  };

  // Lock in hand orientation and begin the round
  const startPlaying = () => {
    setGamePhase('playing');
    setMessage('Your turn!');
  };

  // Player scouts a card — defer placement until player chooses position + side
  const handleScout = (position) => {
    if (animating || currentPlayerIndex !== 0 || !canScout || !currentPlay) return;

    const scoutedCard = { ...currentPlay.cards[position], flipped: false };
    setCurrentPlay(null);
    setPlayedBy(null);
    setCanScout(false);
    setPendingScout(scoutedCard);
    setMessage('Choose which side to use, then click where in your hand to place it');
  };

  // Confirm scout placement at a given index in hand
  const confirmScout = (insertIdx) => {
    if (!pendingScout) return;
    const newHand = [...playerHand];
    newHand.splice(insertIdx, 0, pendingScout);
    setPlayerHand(newHand);
    logMove('You', 'scouted', pendingScout.flipped ? RANKS[10 - pendingScout.value] : pendingScout.rank);
    setPendingScout(null);
    setLastAction('scout');
    setMessage('Card placed!');
    setTimeout(() => nextPlayer(0), 400);
  };

  // Player passes
  const handlePass = () => {
    if (animating || currentPlayerIndex !== 0) return;
    
    if (currentPlay && playedBy !== 0) {
      setAnimating(true);
      logMove('You', 'passed', '—');
      setMessage(`You passed. Player ${playedBy + 1} wins the round!`);
      setTimeout(() => {
        setAnimating(false);
        endRound(playedBy);
      }, 1500);
    }
  };

  // Move to next player
  const nextPlayer = (fromIndex = null) => {
    const currentIndex = fromIndex !== null ? fromIndex : currentPlayerIndex;
    const nextIndex = (currentIndex + 1) % numPlayers;
    setCurrentPlayerIndex(nextIndex);
    setCanScout(true);
    
    if (nextIndex === 0) {
      setMessage('Your turn!');
    } else {
      setTimeout(() => aiTurn(nextIndex), 1000);
    }
  };

  // AI makes a move
  const aiTurn = (aiIndex) => {
    const aiHandIndex = aiIndex - 1;
    setMessage(`Player ${aiIndex + 1} is thinking...`);
    
    setTimeout(() => {
      // Simple AI logic
      const hand = [...aiHands[aiHandIndex]];
      
      // Try to play cards
      let bestPlay = null;
      
      // Look for sets of matching cards
      for (let i = 0; i < hand.length; i++) {
        const matching = hand.filter(c => c.rank === hand[i].rank);
        if (matching.length >= 2 && isValidPlay(matching) && beatsCurrentPlay(matching)) {
          if (!bestPlay || matching.length > bestPlay.length) {
            bestPlay = matching;
          }
        }
      }
      
      // Look for consecutive cards
      const sortedHand = [...hand].sort((a, b) => a.value - b.value);
      for (let len = 3; len <= sortedHand.length; len++) {
        for (let i = 0; i <= sortedHand.length - len; i++) {
          const consecutive = sortedHand.slice(i, i + len);
          if (isValidPlay(consecutive) && beatsCurrentPlay(consecutive)) {
            if (!bestPlay || consecutive.length > bestPlay.length) {
              bestPlay = consecutive;
            }
          }
        }
      }
      
      // Try single cards
      if (!bestPlay) {
        const sortedByValue = [...hand].sort((a, b) => b.value - a.value);
        for (const card of sortedByValue) {
          if (beatsCurrentPlay([card])) {
            bestPlay = [card];
            break;
          }
        }
      }

      if (bestPlay) {
        setAnimating(true);
        setCurrentPlay({ cards: bestPlay, type: 'show' });
        setPlayedBy(aiIndex);
        
        const newHandLength = hand.length - bestPlay.length;
        
        setAiHands(prev => {
          const newHands = [...prev];
          newHands[aiHandIndex] = newHands[aiHandIndex].filter(c => !bestPlay.some(bp => bp.id === c.id));
          return newHands;
        });
        setLastAction(`ai-${aiIndex}-show`);
        logMove(`Player ${aiIndex + 1}`, 'showed', bestPlay.map(c => c.rank).join(', '));
        setMessage(`Player ${aiIndex + 1} played ${bestPlay.length} card(s)`);
        
        setTimeout(() => {
          setAnimating(false);
          if (newHandLength === 0) {
            endRound(aiIndex);
          } else {
            nextPlayer(aiIndex);
          }
        }, 1000);
      } else if (currentPlay && canScout && Math.random() > 0.5) {
        // AI scouts
        const scoutIndex = Math.floor(Math.random() * currentPlay.cards.length);
        const scoutedCard = currentPlay.cards[scoutIndex];
        setAnimating(true);
        setAiHands(prev => {
          const newHands = [...prev];
          newHands[aiHandIndex] = [...newHands[aiHandIndex], { ...scoutedCard }];
          return newHands;
        });
        setCurrentPlay(null);
        setPlayedBy(null);
        setLastAction(`ai-${aiIndex}-scout`);
        logMove(`Player ${aiIndex + 1}`, 'scouted', scoutedCard.rank);
        setMessage(`Player ${aiIndex + 1} scouted a card`);
        
        setTimeout(() => {
          setAnimating(false);
          nextPlayer(aiIndex);
        }, 1000);
      } else {
        // AI passes
        setAnimating(true);
        logMove(`Player ${aiIndex + 1}`, 'passed', '—');
        setMessage(`Player ${aiIndex + 1} passes. Player ${(playedBy || 0) + 1} wins the round!`);
        setTimeout(() => {
          setAnimating(false);
          endRound(playedBy || 0);
        }, 1500);
      }
    }, 1500);
  };

  // End current round
  const endRound = (winnerIndex) => {
    const allHands = [playerHand, ...aiHands.slice(0, numPlayers - 1)];
    const handScores = allHands.map(hand => calculateHandScore(hand));
    
    const roundResult = {
      round: currentRound,
      winner: winnerIndex,
      handScores: handScores,
      points: handScores.map((score, idx) => idx === winnerIndex ? 0 : 0)
    };

    // Winner gets points equal to sum of all other players' hand values
    const winnerPoints = handScores.reduce((sum, score, idx) => 
      idx === winnerIndex ? sum : sum + score, 0
    );
    
    roundResult.points[winnerIndex] = winnerPoints;

    if (winnerIndex === 0) {
      setPlayerScore(prev => prev + winnerPoints);
    } else {
      setAiScores(prev => {
        const newScores = [...prev];
        newScores[winnerIndex - 1] += winnerPoints;
        return newScores;
      });
    }

    setRoundScores(prev => [...prev, roundResult]);
    setGameState('roundEnd');
    setMessage(winnerIndex === 0 ? 'You won the round!' : `Player ${winnerIndex + 1} won the round!`);

    if (currentRound >= totalRounds) {
      setTimeout(() => {
        setGameState('gameEnd');
      }, 2000);
    }
  };

  // Continue to next round
  const nextRound = () => {
    setCurrentRound(prev => prev + 1);
    startRound(numPlayers);
  };

  // Playing card component — two numbers, no suits
  const Card = ({ card, selectable, selected, onClick, canFlip, index, showBack = false, size = 'md' }) => {
    const topRank = card && (card.flipped ? RANKS[10 - card.value] : card.rank);
    const bottomRank = card && (card.flipped ? card.rank : RANKS[10 - card.value]);

    const w = size === 'sm' ? 52 : 72;
    const h = size === 'sm' ? 74 : 104;
    const overlap = size === 'sm' ? -20 : -28;
    const topNumSize = size === 'sm' ? 18 : 26;
    const bottomNumSize = size === 'sm' ? 14 : 20;

    if (showBack) {
      return (
        <div style={{ position: 'relative', marginRight: `${overlap}px`, zIndex: index, flexShrink: 0 }}>
          <div style={{
            width: w, height: h,
            borderRadius: 8,
            border: '2px solid #93c5fd',
            background: 'linear-gradient(145deg, #1d4ed8, #1e40af)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: w - 10, height: h - 10,
              borderRadius: 4,
              border: '1.5px solid rgba(255,255,255,0.25)',
              background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 9px)',
            }} />
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'relative',
          marginRight: `${overlap}px`,
          zIndex: selected ? 200 : index,
          flexShrink: 0,
          transform: selected ? 'translateY(-22px)' : 'translateY(0)',
          transition: 'transform 0.15s ease',
          cursor: selectable ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        <div style={{
          width: w, height: h,
          borderRadius: 8,
          border: selected ? '3px solid #facc15' : '1.5px solid #d1d5db',
          backgroundColor: '#ffffff',
          boxShadow: selected
            ? '0 10px 24px rgba(0,0,0,0.3), 0 0 0 2px rgba(250,204,21,0.5)'
            : selectable ? '0 4px 10px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          padding: '6px',
          position: 'relative',
          userSelect: 'none',
        }}>
          {/* Top value */}
          <div style={{ fontWeight: 900, fontSize: topNumSize, color: '#111827', lineHeight: 1, textAlign: 'left' }}>
            {topRank}
          </div>

          {/* Divider line */}
          <div style={{ height: 1, background: '#e5e7eb', margin: '0 2px' }} />

          {/* Bottom value — upside down (alternate) */}
          <div style={{ fontWeight: 700, fontSize: bottomNumSize, color: '#6b7280', lineHeight: 1, textAlign: 'right', transform: 'rotate(180deg)' }}>
            {bottomRank}
          </div>

          {/* Flip button */}
          {canFlip && (
            <button
              onClick={(e) => { e.stopPropagation(); flipCard(card.id); }}
              style={{
                position: 'absolute', top: 3, right: 3,
                background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 4,
                width: 16, height: 16, fontSize: 10,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', zIndex: 10,
              }}
            >↻</button>
          )}

          {/* Flipped indicator */}
          {card.flipped && (
            <div style={{
              position: 'absolute', bottom: 3, left: 3,
              background: '#f97316', color: 'white',
              borderRadius: 4, width: 14, height: 14, fontSize: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold',
            }}>↕</div>
          )}
        </div>
      </div>
    );
  };

  const menuBtnBase = {
    display: 'block', width: '100%', border: 'none', borderRadius: 14,
    padding: '18px 0', fontSize: 20, fontFamily: "'Nunito', sans-serif",
    fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5,
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: gameState === 'menu' ? '#0f2d1a' : '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        {/* ── MENU SCREEN ── */}
        {gameState === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, padding: '60px 24px' }}>

            {/* Logo / Title */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 100, lineHeight: 1, marginBottom: 8 }}>🃏</div>
              <h1 style={{
                fontFamily: "'Lilita One', cursive",
                fontSize: 'clamp(72px, 12vw, 120px)',
                color: '#fbbf24',
                textShadow: '0 4px 24px rgba(251,191,36,0.5), 0 2px 0 #92400e',
                letterSpacing: 4,
                lineHeight: 1,
                margin: 0,
              }}>SCOUT</h1>
              <p style={{
                fontFamily: "'Nunito', sans-serif",
                color: '#86efac',
                fontSize: 18,
                fontWeight: 600,
                marginTop: 12,
                letterSpacing: 1,
              }}>
                The card game of cunning plays and daring scouts
              </p>
            </div>

            {/* Settings card */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 24,
              padding: '40px 48px',
              width: '100%',
              maxWidth: 560,
              backdropFilter: 'blur(8px)',
            }}>

              {/* Player count */}
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: '#86efac', fontSize: 13, fontWeight: 800,
                  letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14,
                }}>Number of Players</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[2, 3, 4].map(count => (
                    <button
                      key={count}
                      onClick={() => setNumPlayers(count)}
                      style={{
                        flex: 1, padding: '14px 0', borderRadius: 12, fontSize: 18,
                        fontFamily: "'Nunito', sans-serif", fontWeight: 800, cursor: 'pointer',
                        border: numPlayers === count ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.15)',
                        background: numPlayers === count ? '#fbbf24' : 'rgba(255,255,255,0.07)',
                        color: numPlayers === count ? '#1a1a1a' : '#d1d5db',
                        boxShadow: numPlayers === count ? '0 4px 16px rgba(251,191,36,0.4)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {count}P
                    </button>
                  ))}
                </div>
              </div>

              {/* Game length */}
              <div>
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  color: '#86efac', fontSize: 13, fontWeight: 800,
                  letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14,
                }}>Game Length</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => startGame(1, numPlayers)}
                    style={{ ...menuBtnBase, background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(22,163,74,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                  >
                    ⚡ Quick Game — 1 Round
                  </button>
                  <button
                    onClick={() => startGame(5, numPlayers)}
                    style={{ ...menuBtnBase, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(37,99,235,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                  >
                    🎮 Standard — 5 Rounds
                  </button>
                  <button
                    onClick={() => startGame(10, numPlayers)}
                    style={{ ...menuBtnBase, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(124,58,237,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                  >
                    🏆 Epic Battle — 10 Rounds
                  </button>
                </div>
              </div>
            </div>

            {/* How to play hint */}
            <div style={{
              display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {[
                { icon: '▶', label: 'Show', desc: 'Play a set that beats the current play' },
                { icon: '◎', label: 'Scout', desc: 'Take a card from the current play' },
                { icon: '✕', label: 'Pass', desc: 'Concede the round to the current player' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '16px 22px', textAlign: 'center', minWidth: 140,
                }}>
                  <div style={{ fontSize: 26, marginBottom: 6, color: '#fbbf24' }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, color: '#f9fafb', fontSize: 16, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: '#9ca3af', fontSize: 12, lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 8, padding: '8px 12px', fontFamily: "'Nunito', sans-serif" }}>

            {/* ── HEADER: round + scores ── */}
            <div style={{
              background: 'white', borderRadius: 14,
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              padding: '10px 16px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ background: '#6d28d9', color: 'white', borderRadius: 10, padding: '6px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.85, letterSpacing: 2, textTransform: 'uppercase' }}>Round</div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Lilita One', cursive" }}>{currentRound} / {totalRounds}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Player score */}
                <div style={{
                  background: currentPlayerIndex === 0 ? '#16a34a' : '#f3f4f6',
                  color: currentPlayerIndex === 0 ? 'white' : '#374151',
                  borderRadius: 10, padding: '6px 18px', textAlign: 'center',
                  border: currentPlayerIndex === 0 ? '2px solid #15803d' : '2px solid #e5e7eb',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>You</div>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Lilita One', cursive" }}>{playerScore}</div>
                </div>
                {/* AI scores */}
                {Array.from({ length: numPlayers - 1 }).map((_, idx) => (
                  <div key={idx} style={{
                    background: currentPlayerIndex === idx + 1 ? '#ea580c' : '#f3f4f6',
                    color: currentPlayerIndex === idx + 1 ? 'white' : '#374151',
                    borderRadius: 10, padding: '6px 18px', textAlign: 'center',
                    border: currentPlayerIndex === idx + 1 ? '2px solid #c2410c' : '2px solid #e5e7eb',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>P{idx + 2}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Lilita One', cursive" }}>{aiScores[idx]}</div>
                  </div>
                ))}
              </div>
              {/* Status message */}
              <div style={{
                background: message.includes('Invalid') || message.includes('must') ? '#dc2626'
                  : message.includes('won') || message.includes('Won') ? '#16a34a' : '#2563eb',
                color: 'white', borderRadius: 8, padding: '6px 14px',
                fontWeight: 700, fontSize: 14, maxWidth: 280, textAlign: 'center',
              }}>
                {message}
              </div>
            </div>

            {/* ── OPPONENT HANDS ── */}
            <div style={{
              background: 'white', borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '12px 16px', flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${numPlayers - 1}, 1fr)`,
              gap: 12,
            }}>
              {Array.from({ length: numPlayers - 1 }).map((_, idx) => {
                const isActive = currentPlayerIndex === idx + 1;
                return (
                  <div key={idx} style={{
                    background: isActive ? '#fff7ed' : '#f9fafb',
                    border: isActive ? '2px solid #f97316' : '2px solid #e5e7eb',
                    borderRadius: 10, padding: '10px 12px', textAlign: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontFamily: "'Lilita One', cursive", fontSize: 16, color: isActive ? '#ea580c' : '#374151' }}>
                        Player {idx + 2}
                      </span>
                      <span style={{
                        background: isActive ? '#ea580c' : '#6b7280',
                        color: 'white', borderRadius: 99, padding: '1px 10px', fontSize: 12, fontWeight: 700,
                        fontFamily: "'Nunito', sans-serif",
                      }}>
                        {aiHands[idx]?.length || 0} cards
                      </span>
                      {isActive && <span style={{ fontSize: 13, fontFamily: "'Lilita One', cursive", color: '#ea580c' }}>TURN</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: `${(aiHands[idx]?.length || 0) * 11}px`, overflow: 'visible' }}>
                      {aiHands[idx]?.map((card, cardIdx) => (
                        <Card key={card.id} card={card} index={cardIdx} showBack={true} size="sm" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── PLAY AREA + MOVE LOG (middle row) ── */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8 }}>

              {/* Play area */}
              <div style={{
                flex: 1, minWidth: 0,
                background: '#d1fae5',
                border: '3px solid #34d399',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '14px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 20, color: '#065f46', marginBottom: 12, letterSpacing: 1 }}>
                  Play Area {playedBy !== null && (
                    <span style={{ fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: '#047857', background: '#a7f3d0', borderRadius: 6, padding: '2px 10px', marginLeft: 6 }}>
                      {playedBy === 0 ? 'Your play' : `Player ${playedBy + 1}'s play`}
                    </span>
                  )}
                </div>

                {currentPlay ? (
                  <>
                    <div style={{ display: 'flex', paddingLeft: `${(currentPlay.cards.length - 1) * 23}px`, overflow: 'visible', marginBottom: 12 }}>
                      {currentPlay.cards.map((card, idx) => (
                        <Card
                          key={card.id}
                          card={card}
                          index={idx}
                          onClick={() => currentPlayerIndex === 0 && canScout && playedBy !== 0 && handleScout(idx)}
                          selectable={currentPlayerIndex === 0 && canScout && playedBy !== 0}
                        />
                      ))}
                    </div>
                    {currentPlayerIndex === 0 && canScout && playedBy !== 0 && (
                      <div style={{
                        background: '#fef08a', border: '2px solid #ca8a04',
                        borderRadius: 8, padding: '6px 16px',
                        fontWeight: 800, fontSize: 14, color: '#713f12',
                      }}>
                        👆 Click any card above to scout it into your hand
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.35 }}>🃏</div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>No cards played yet — make the first play!</div>
                  </div>
                )}
              </div>

              {/* Move log */}
              <div style={{
                width: 210, flexShrink: 0,
                background: '#fffbeb',
                border: '2px solid #fcd34d',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: '#f59e0b', color: 'white',
                  padding: '10px 12px', flexShrink: 0,
                  fontFamily: "'Lilita One', cursive", fontSize: 15, letterSpacing: 0.5,
                }}>
                  Move History
                </div>
                <div style={{
                  flex: 1, overflowY: 'auto',
                  padding: '6px 8px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {moveLog.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                      No moves yet
                    </div>
                  ) : (
                    [...moveLog].reverse().map((entry, i) => {
                      const isYou = entry.playerName === 'You';
                      const actionColor = entry.action === 'showed' ? '#16a34a'
                        : entry.action === 'scouted' ? '#2563eb'
                        : '#6b7280';
                      const actionLabel = entry.action === 'showed' ? '▶ Showed'
                        : entry.action === 'scouted' ? '◎ Scouted'
                        : '✕ Passed';
                      return (
                        <div key={entry.id} style={{
                          background: isYou ? '#f0fdf4' : '#fff',
                          border: `1px solid ${isYou ? '#86efac' : '#e5e7eb'}`,
                          borderRadius: 6, padding: '5px 8px', fontSize: 12,
                        }}>
                          <div style={{ fontWeight: 800, color: isYou ? '#15803d' : '#374151', marginBottom: 2 }}>
                            {entry.playerName}
                          </div>
                          <div style={{ color: actionColor, fontWeight: 700 }}>{actionLabel}</div>
                          {entry.action !== 'passed' && (
                            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>{entry.detail}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* ── YOUR HAND (bottom) ── */}
            <div style={{
              background: '#eff6ff',
              border: '3px solid #60a5fa',
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '12px 16px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Lilita One', cursive", fontSize: 19, color: '#1e3a8a' }}>Your Hand</span>
                <span style={{ background: '#2563eb', color: 'white', borderRadius: 99, padding: '2px 12px', fontWeight: 700, fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>
                  {playerHand.length} cards
                </span>
                {currentPlayerIndex === 0 && (
                  <span style={{ background: '#16a34a', color: 'white', borderRadius: 99, padding: '2px 12px', fontFamily: "'Lilita One', cursive", fontSize: 13 }}>
                    YOUR TURN
                  </span>
                )}
              </div>

              {/* Cards */}
              {/* Orient-hand phase banner */}
              {gamePhase === 'orientHand' && (
                <div style={{
                  background: '#fef9c3', border: '2px solid #fbbf24',
                  borderRadius: 8, padding: '8px 14px', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#78350f' }}>
                    🃏 Flip cards to choose which value faces up, then lock in your hand.
                  </span>
                  <button
                    onClick={startPlaying}
                    style={{
                      background: '#16a34a', color: 'white', border: 'none',
                      borderRadius: 7, padding: '8px 20px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    ✓ Start Round
                  </button>
                </div>
              )}

              {/* Scout placement UI */}
              {pendingScout && (
                <div style={{
                  background: '#eff6ff', border: '2px solid #60a5fa',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a8a', marginBottom: 8 }}>
                    🎯 Place your scouted card — choose which side faces up, then click a gap in your hand
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Preview with flip */}
                    <div style={{ position: 'relative' }}>
                      <Card card={pendingScout} index={0} size="md" />
                      <button
                        onClick={() => setPendingScout(prev => ({ ...prev, flipped: !prev.flipped }))}
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          background: '#f97316', color: 'white', border: 'none',
                          borderRadius: '50%', width: 24, height: 24, fontSize: 13,
                          cursor: 'pointer', fontWeight: 'bold', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >↻</button>
                    </div>
                    <div style={{ color: '#374151', fontSize: 12, fontWeight: 600 }}>
                      Active value: <strong style={{ fontSize: 16, color: '#1d4ed8' }}>
                        {pendingScout.flipped ? RANKS[10 - pendingScout.value] : pendingScout.rank}
                      </strong>
                      <br />Click a gap ↓ below to insert
                    </div>
                  </div>
                </div>
              )}

              {/* Hand */}
              {pendingScout ? (
                // Scout placement mode: show hand with insertion gaps
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0, marginBottom: 10, flexWrap: 'wrap' }}>
                  {/* Gap before first card */}
                  <button
                    onClick={() => confirmScout(0)}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 60, cursor: 'pointer', fontSize: 16, fontWeight: 800, flexShrink: 0 }}
                    title="Insert here"
                  >+</button>
                  {playerHand.map((card, idx) => (
                    <React.Fragment key={card.id}>
                      <Card card={card} index={idx} size="md" />
                      <button
                        onClick={() => confirmScout(idx + 1)}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 60, cursor: 'pointer', fontSize: 16, fontWeight: 800, flexShrink: 0, zIndex: 300, position: 'relative' }}
                        title="Insert here"
                      >+</button>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: `${playerHand.length * 23}px`, overflow: 'visible', marginBottom: 10 }}>
                  {playerHand.map((card, idx) => (
                    <Card
                      key={card.id}
                      card={card}
                      index={idx}
                      onClick={() => gamePhase === 'orientHand' ? flipCard(card.id) : toggleCardSelection(card.id)}
                      selectable={gamePhase === 'orientHand' || (currentPlayerIndex === 0 && !animating)}
                      selected={selectedCards.includes(card.id)}
                      canFlip={gamePhase === 'orientHand'}
                    />
                  ))}
                </div>
              )}

              {/* Action buttons — only during play phase */}
              {gamePhase === 'playing' && !pendingScout && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleShow}
                    disabled={currentPlayerIndex !== 0 || animating || selectedCards.length === 0}
                    style={{
                      background: currentPlayerIndex !== 0 || animating || selectedCards.length === 0 ? '#9ca3af' : '#16a34a',
                      color: 'white', border: 'none', borderRadius: 8,
                      padding: '10px 28px', fontWeight: 800, fontSize: 16,
                      cursor: currentPlayerIndex !== 0 || animating || selectedCards.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <ArrowUp size={18} /> Show Selected Cards
                  </button>
                  <button
                    onClick={handlePass}
                    disabled={currentPlayerIndex !== 0 || animating || !currentPlay || playedBy === 0}
                    style={{
                      background: currentPlayerIndex !== 0 || animating || !currentPlay || playedBy === 0 ? '#9ca3af' : '#dc2626',
                      color: 'white', border: 'none', borderRadius: 8,
                      padding: '10px 28px', fontWeight: 800, fontSize: 16,
                      cursor: currentPlayerIndex !== 0 || animating || !currentPlay || playedBy === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    Pass Turn
                  </button>
                </div>
              )}

              <div style={{ background: '#bfdbfe', borderRadius: 6, padding: '5px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                {gamePhase === 'orientHand'
                  ? 'Click any card to flip its value • Click ↻ button to flip • Confirm with Start Round'
                  : 'Click cards to select them • Click cards in the play area to scout'}
              </div>
            </div>

          </div>
        )}

        {/* Round End Screen */}
        {gameState === 'roundEnd' && roundScores.length > 0 && (() => {
          const last = roundScores[roundScores.length - 1];
          const youWon = last.winner === 0;
          return (
            <div style={{
              background: 'white', borderRadius: 20,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              padding: '48px 40px', textAlign: 'center',
              maxWidth: 720, margin: '0 auto', width: '100%',
            }}>
              <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 42, color: '#1f2937', marginBottom: 16 }}>
                Round {currentRound} Complete!
              </div>
              <div style={{ fontSize: 80, marginBottom: 12, lineHeight: 1 }}>
                {youWon ? '🏆' : '🤖'}
              </div>
              <div style={{
                fontFamily: "'Lilita One', cursive", fontSize: 30,
                color: youWon ? '#16a34a' : '#ea580c',
                marginBottom: 32,
              }}>
                {youWon ? 'You Won This Round!' : `Player ${last.winner + 1} Won This Round!`}
              </div>

              {/* Round points grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${numPlayers}, 1fr)`,
                gap: 12, marginBottom: 28, maxWidth: 560, margin: '0 auto 28px',
              }}>
                <div style={{
                  background: youWon ? '#16a34a' : '#e5e7eb',
                  color: youWon ? 'white' : '#374151',
                  borderRadius: 12, padding: '20px 12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 6, opacity: 0.85 }}>You</div>
                  <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 40 }}>+{last.points[0]}</div>
                </div>
                {Array.from({ length: numPlayers - 1 }).map((_, idx) => (
                  <div key={idx} style={{
                    background: last.winner === idx + 1 ? '#ea580c' : '#e5e7eb',
                    color: last.winner === idx + 1 ? 'white' : '#374151',
                    borderRadius: 12, padding: '20px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 6, opacity: 0.85 }}>Player {idx + 2}</div>
                    <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 40 }}>+{last.points[idx + 1]}</div>
                  </div>
                ))}
              </div>

              {/* Total scores */}
              <div style={{
                background: '#eff6ff', border: '2px solid #bfdbfe',
                borderRadius: 14, padding: '24px', marginBottom: 28,
              }}>
                <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 22, color: '#1e3a8a', marginBottom: 16 }}>
                  Total Scores
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ background: '#16a34a', color: 'white', borderRadius: 12, padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>Your Total</div>
                    <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 38 }}>{playerScore}</div>
                  </div>
                  {Array.from({ length: numPlayers - 1 }).map((_, idx) => (
                    <div key={idx} style={{ background: '#ea580c', color: 'white', borderRadius: 12, padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>P{idx + 2} Total</div>
                      <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 38 }}>{aiScores[idx]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {currentRound < totalRounds && (
                <button
                  onClick={nextRound}
                  style={{
                    background: '#16a34a', color: 'white', border: 'none',
                    borderRadius: 12, padding: '14px 48px',
                    fontFamily: "'Lilita One', cursive", fontSize: 24,
                    cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                  Next Round
                </button>
              )}
            </div>
          );
        })()}

        {/* Game End Screen */}
        {gameState === 'gameEnd' && (() => {
          const allScores = [playerScore, ...aiScores.slice(0, numPlayers - 1)];
          const maxScore = Math.max(...allScores);
          const winnerIndex = allScores.indexOf(maxScore);
          const winners = allScores.filter(s => s === maxScore).length;
          const resultColor = winners > 1 ? '#2563eb' : winnerIndex === 0 ? '#16a34a' : '#ea580c';
          const resultText = winners > 1 ? "It's a Tie!" : winnerIndex === 0 ? 'YOU WIN!' : `Player ${winnerIndex + 1} Wins!`;

          return (
            <div style={{
              background: 'white', borderRadius: 20,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              padding: '48px 40px', textAlign: 'center',
              maxWidth: 720, margin: '0 auto', width: '100%',
            }}>
              {/* Trophy icon */}
              <div style={{ marginBottom: 8 }}>
                <Trophy style={{ width: 80, height: 80, color: '#f59e0b', display: 'inline-block' }} />
              </div>
              <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 44, color: '#1f2937', marginBottom: 8 }}>
                GAME OVER
              </div>
              <div style={{ fontSize: 72, marginBottom: 8, lineHeight: 1 }}>
                {winners > 1 ? '🤝' : winnerIndex === 0 ? '🎉' : '😔'}
              </div>
              <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 34, color: resultColor, marginBottom: 32 }}>
                {resultText}
              </div>

              {/* Final score cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${numPlayers}, 1fr)`,
                gap: 12, marginBottom: 28, maxWidth: 560, margin: '0 auto 28px',
              }}>
                <div style={{
                  background: playerScore === maxScore ? '#f59e0b' : '#16a34a',
                  color: 'white', borderRadius: 12, padding: '20px 12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 4, opacity: 0.9 }}>Your Score</div>
                  <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 44 }}>{playerScore}</div>
                  {playerScore === maxScore && <div style={{ fontSize: 28, marginTop: 4 }}>👑</div>}
                </div>
                {Array.from({ length: numPlayers - 1 }).map((_, idx) => (
                  <div key={idx} style={{
                    background: aiScores[idx] === maxScore ? '#f59e0b' : '#ea580c',
                    color: 'white', borderRadius: 12, padding: '20px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 4, opacity: 0.9 }}>Player {idx + 2}</div>
                    <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 44 }}>{aiScores[idx]}</div>
                    {aiScores[idx] === maxScore && <div style={{ fontSize: 28, marginTop: 4 }}>👑</div>}
                  </div>
                ))}
              </div>

              {/* Round Summary */}
              <div style={{
                background: '#f9fafb', border: '2px solid #e5e7eb',
                borderRadius: 14, padding: '24px', marginBottom: 32,
                maxWidth: 500, margin: '0 auto 32px',
              }}>
                <div style={{ fontFamily: "'Lilita One', cursive", fontSize: 22, color: '#374151', marginBottom: 16 }}>
                  Round Summary
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roundScores.map((round, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: round.winner === 0 ? '#dcfce7' : '#ffedd5',
                      borderRadius: 8, padding: '10px 14px',
                    }}>
                      <span style={{ fontFamily: "'Lilita One', cursive", fontSize: 15, color: '#1f2937' }}>Round {round.round}</span>
                      <span style={{
                        fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13,
                        background: round.winner === 0 ? '#16a34a' : '#ea580c',
                        color: 'white', borderRadius: 6, padding: '3px 10px',
                      }}>
                        {round.winner === 0 ? 'You Won' : `P${round.winner + 1} Won`}
                      </span>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, color: '#374151' }}>
                        +{round.points[round.winner]} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setGameState('menu')}
                style={{
                  background: '#7c3aed', color: 'white', border: 'none',
                  borderRadius: 12, padding: '14px 48px',
                  fontFamily: "'Lilita One', cursive", fontSize: 24,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                Play Again
              </button>
            </div>
          );
        })()}
      </div>

    </div>
  );
};

export default ScoutGame;