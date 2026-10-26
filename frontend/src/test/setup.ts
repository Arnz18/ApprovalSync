import '@testing-library/jest-dom';

// JSDOM does not implement window.scrollTo or window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
