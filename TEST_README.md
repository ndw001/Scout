# Scout Card Game - Testing Guide

## Overview
This document explains how to run the tests for the Scout card game, including specific tests for turn rotation issues.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run all tests:
```bash
npm test
```

3. Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

4. Run tests with coverage report:
```bash
npm run test:coverage
```

## Test Categories

### 1. Turn Rotation Tests
These tests specifically verify that the game properly rotates through all players:

- **2-Player Turn Rotation**: Verifies player 1 → player 2 → player 1 rotation
- **3-Player Turn Rotation**: Verifies player 1 → player 2 → player 3 → player 1 rotation  
- **4-Player Turn Rotation**: Verifies player 1 → player 2 → player 3 → player 4 → player 1 rotation

**What these tests catch:**
- Players getting stuck on AI turns
- Turn not advancing after AI plays
- Incorrect player index calculation
- State closure issues in async callbacks

### 2. Game Logic Tests
- Card dealing (correct number of cards per player)
- Card selection functionality
- Card flipping mechanism
- Turn restrictions (can't play out of turn)

### 3. Scoring Tests
- Score initialization
- Point award to round winners
- Score accumulation across rounds

### 4. Round Management Tests
- Round counter display
- Round progression
- Multi-round games

### 5. UI State Tests
- Menu screen display
- Game screen transitions
- Current player highlighting
- Message display

### 6. Integration Tests
- Complete game flow (start to finish)
- Return to menu functionality

## Common Test Failures and Fixes

### Issue: "Player 2 is thinking" stuck
**Cause**: The `nextPlayer()` function is using stale state from closure
**Fix**: Pass the current player index as a parameter to `nextPlayer(fromIndex)`

### Issue: Tests timeout
**Cause**: Timers not being properly advanced in tests
**Fix**: Use `jest.advanceTimersByTime()` and `act()` wrapper

### Issue: State updates not reflected
**Cause**: React state updates are asynchronous
**Fix**: Use `waitFor()` from testing-library and check computed values instead of state

## Debugging Tests

To see what's happening during a test:

```javascript
import { logGameState } from './scout-game.test';

test('my test', () => {
  const { container } = render(<ScoutGame />);
  logGameState(container); // See current state
});
```

## Manual Testing Checklist

If automated tests pass but you still see issues:

1. ✅ Start a 2-player game
2. ✅ Play a card
3. ✅ Verify "Player 2 is thinking" appears
4. ✅ Verify Player 2 plays a card
5. ✅ Verify "Your turn!" appears
6. ✅ Repeat for 3 and 4 player games

## Key Files

- `scout-game.jsx` - Main game component
- `scout-game.test.jsx` - Test suite
- `package.json` - Dependencies and test scripts
- `jest.setup.js` - Jest configuration
- `babel.config.js` - Babel transpilation for JSX

## Technical Details

### State Management Issue
The main bug was in the `nextPlayer()` function reading `currentPlayerIndex` from closure, which was stale when called from within `setTimeout` callbacks.

**Before (broken):**
```javascript
const nextPlayer = () => {
  const nextIndex = (currentPlayerIndex + 1) % numPlayers; // ❌ stale
  setCurrentPlayerIndex(nextIndex);
  // ...
}
```

**After (fixed):**
```javascript
const nextPlayer = (fromIndex = null) => {
  const currentIndex = fromIndex !== null ? fromIndex : currentPlayerIndex; // ✅ passed in
  const nextIndex = (currentIndex + 1) % numPlayers;
  setCurrentPlayerIndex(nextIndex);
  // ...
}

// Called with explicit index
nextPlayer(aiIndex); // ✅ correct current player
```

### Why Tests Matter

Tests would have caught this bug immediately by:
1. Simulating a full turn rotation
2. Verifying each expected player's turn message appears
3. Timing out if stuck on a player

## Continuous Integration

To run tests in CI/CD:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```
