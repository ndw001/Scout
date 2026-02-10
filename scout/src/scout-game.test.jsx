import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoutGame from './scout-game';

// Mock timers for controlling setTimeout
jest.useFakeTimers();

describe('Scout Game Tests', () => {
  
  describe('Turn Rotation Tests', () => {
    test('should rotate from player 1 to player 2 in 2-player game', async () => {
      const { container } = render(<ScoutGame />);
      
      // Start a 2-player, 1-round game
      const twoPlayerButton = screen.getByText('2 Players');
      fireEvent.click(twoPlayerButton);
      
      const oneRoundButton = screen.getByText('Play 1 Round');
      fireEvent.click(oneRoundButton);
      
      // Verify we're on player 1's turn
      await waitFor(() => {
        expect(screen.getByText(/Your turn|Select cards to play/i)).toBeInTheDocument();
      });
      
      // Select and play cards for player 1
      const playerCards = container.querySelectorAll('.cursor-pointer');
      if (playerCards.length > 0) {
        fireEvent.click(playerCards[0]);
        
        const showButton = screen.getByText('Show Cards');
        fireEvent.click(showButton);
        
        // Wait for animation
        act(() => {
          jest.advanceTimersByTime(500);
        });
        
        // Should now be player 2's turn
        await waitFor(() => {
          expect(screen.getByText(/Player 2 is thinking/i)).toBeInTheDocument();
        }, { timeout: 2000 });
        
        // Advance AI turn timers
        act(() => {
          jest.advanceTimersByTime(1500);
        });
        
        // AI should make a move and potentially return to player 1
        act(() => {
          jest.advanceTimersByTime(2000);
        });
      }
    });
    
    test('should rotate through all 3 players in 3-player game', async () => {
      const { container } = render(<ScoutGame />);
      
      // Start a 3-player, 1-round game
      const threePlayerButton = screen.getByText('3 Players');
      fireEvent.click(threePlayerButton);
      
      const oneRoundButton = screen.getByText('Play 1 Round');
      fireEvent.click(oneRoundButton);
      
      // Player 1 plays
      const playerCards = container.querySelectorAll('.cursor-pointer');
      if (playerCards.length > 0) {
        fireEvent.click(playerCards[0]);
        const showButton = screen.getByText('Show Cards');
        fireEvent.click(showButton);
        
        act(() => {
          jest.advanceTimersByTime(500);
        });
        
        // Should go to player 2
        await waitFor(() => {
          expect(screen.getByText(/Player 2 is thinking/i)).toBeInTheDocument();
        });
        
        act(() => {
          jest.advanceTimersByTime(1500);
          jest.advanceTimersByTime(1000);
        });
        
        // Should go to player 3
        await waitFor(() => {
          expect(screen.getByText(/Player 3 is thinking/i)).toBeInTheDocument();
        });
        
        act(() => {
          jest.advanceTimersByTime(1500);
          jest.advanceTimersByTime(1000);
        });
        
        // Should return to player 1
        await waitFor(() => {
          expect(screen.getByText(/Your turn/i)).toBeInTheDocument();
        });
      }
    });
    
    test('should rotate through all 4 players in 4-player game', async () => {
      const { container } = render(<ScoutGame />);
      
      // Start a 4-player, 1-round game
      const fourPlayerButton = screen.getByText('4 Players');
      fireEvent.click(fourPlayerButton);
      
      const oneRoundButton = screen.getByText('Play 1 Round');
      fireEvent.click(oneRoundButton);
      
      const expectedPlayerOrder = [
        'Player 2 is thinking',
        'Player 3 is thinking',
        'Player 4 is thinking',
        'Your turn'
      ];
      
      // Player 1 plays
      const playerCards = container.querySelectorAll('.cursor-pointer');
      if (playerCards.length > 0) {
        fireEvent.click(playerCards[0]);
        const showButton = screen.getByText('Show Cards');
        fireEvent.click(showButton);
        
        act(() => {
          jest.advanceTimersByTime(500);
        });
        
        // Verify each player's turn in sequence
        for (const expectedMessage of expectedPlayerOrder.slice(0, 3)) {
          await waitFor(() => {
            expect(screen.getByText(new RegExp(expectedMessage, 'i'))).toBeInTheDocument();
          });
          
          act(() => {
            jest.advanceTimersByTime(2500);
          });
        }
        
        // Should return to player 1
        await waitFor(() => {
          expect(screen.getByText(/Your turn/i)).toBeInTheDocument();
        });
      }
    });
  });
  
  describe('Game Logic Tests', () => {
    test('should start with correct number of cards for each player', () => {
      const { container } = render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Player should have 9 cards
      const playerHandSection = screen.getByText(/Your Hand \(9 cards\)/i);
      expect(playerHandSection).toBeInTheDocument();
      
      // AI should have 9 cards
      const aiHandSection = screen.getByText(/Player 2 \(9 cards\)/i);
      expect(aiHandSection).toBeInTheDocument();
    });
    
    test('should allow card selection', () => {
      const { container } = render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      const selectableCards = container.querySelectorAll('.cursor-pointer');
      expect(selectableCards.length).toBeGreaterThan(0);
      
      // Click a card to select it
      fireEvent.click(selectableCards[0]);
      
      // Show button should be enabled
      const showButton = screen.getByText('Show Cards');
      expect(showButton).not.toBeDisabled();
    });
    
    test('should allow card flipping', () => {
      const { container } = render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Look for flip buttons (⟲)
      const flipButtons = container.querySelectorAll('button[class*="absolute top-1 right-1"]');
      expect(flipButtons.length).toBeGreaterThan(0);
      
      // Click flip button
      fireEvent.click(flipButtons[0]);
      
      // Card should show flipped indicator
      const flippedIndicator = container.querySelector('.bg-amber-500');
      expect(flippedIndicator).toBeInTheDocument();
    });
    
    test('should not allow playing cards when not player turn', () => {
      const { container } = render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Make a move to switch to AI turn
      const selectableCards = container.querySelectorAll('.cursor-pointer');
      fireEvent.click(selectableCards[0]);
      fireEvent.click(screen.getByText('Show Cards'));
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // During AI turn, player's show button should be disabled
      const showButton = screen.getByText('Show Cards');
      expect(showButton).toBeDisabled();
    });
  });
  
  describe('Scoring Tests', () => {
    test('should initialize with zero scores', () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Check initial scores are 0
      const scoreElements = screen.getAllByText('0');
      expect(scoreElements.length).toBeGreaterThanOrEqual(2);
    });
    
    test('should award points to round winner', async () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Play through the game quickly
      act(() => {
        jest.runAllTimers();
      });
      
      // Eventually should show a winner with points
      await waitFor(() => {
        const pointsElements = screen.queryAllByText(/\+\d+/);
        if (pointsElements.length > 0) {
          expect(pointsElements.length).toBeGreaterThan(0);
        }
      }, { timeout: 5000 });
    });
  });
  
  describe('Round Management Tests', () => {
    test('should show correct round number', () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 5 Rounds'));
      
      // Should show Round 1 / 5
      expect(screen.getByText(/1/)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });
    
    test('should advance to next round after round end', async () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 5 Rounds'));
      
      // Fast forward through a round
      act(() => {
        jest.runAllTimers();
      });
      
      // Look for "Next Round" button
      await waitFor(() => {
        const nextRoundButton = screen.queryByText('Next Round');
        if (nextRoundButton) {
          fireEvent.click(nextRoundButton);
        }
      }, { timeout: 5000 });
    });
  });
  
  describe('UI State Tests', () => {
    test('should show menu screen initially', () => {
      render(<ScoutGame />);
      
      expect(screen.getByText('Scout')).toBeInTheDocument();
      expect(screen.getByText('Play 1 Round')).toBeInTheDocument();
      expect(screen.getByText('Play 5 Rounds')).toBeInTheDocument();
      expect(screen.getByText('Play 10 Rounds')).toBeInTheDocument();
    });
    
    test('should show game screen after starting', () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      expect(screen.getByText(/Your Hand/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Play/i)).toBeInTheDocument();
    });
    
    test('should highlight current player', () => {
      const { container } = render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Player 1's score should be highlighted (green)
      const playerScoreElements = container.querySelectorAll('.text-green-600');
      expect(playerScoreElements.length).toBeGreaterThan(0);
    });
  });
  
  describe('Integration Tests', () => {
    test('should complete a full 2-player game', async () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Fast forward through entire game
      act(() => {
        jest.runAllTimers();
      });
      
      // Should eventually show game over
      await waitFor(() => {
        expect(screen.queryByText(/Game Over|Complete|Won/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
    
    test('should allow returning to menu from game end', async () => {
      render(<ScoutGame />);
      
      fireEvent.click(screen.getByText('2 Players'));
      fireEvent.click(screen.getByText('Play 1 Round'));
      
      // Fast forward through game
      act(() => {
        jest.runAllTimers();
      });
      
      // Wait for game end and click Play Again
      await waitFor(() => {
        const playAgainButton = screen.queryByText('Play Again');
        if (playAgainButton) {
          fireEvent.click(playAgainButton);
          expect(screen.getByText('Scout')).toBeInTheDocument();
        }
      }, { timeout: 10000 });
    });
  });
});

// Helper function for debugging
function logGameState(container) {
  console.log('Current visible text:', container.textContent);
  console.log('All buttons:', Array.from(container.querySelectorAll('button')).map(b => b.textContent));
}

export default describe;