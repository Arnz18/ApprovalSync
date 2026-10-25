import '@testing-library/jest-dom';

// JSDOM does not implement window.scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
