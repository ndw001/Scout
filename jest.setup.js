import '@testing-library/jest-dom';

// Mock timers for all tests
global.setTimeout = jest.fn((callback, delay) => {
  return setTimeout(callback, delay);
});

// Suppress console errors during tests (optional)
// global.console.error = jest.fn();
