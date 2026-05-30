// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsPDF uses browser APIs not available in Jest/jsdom
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    setTextColor: jest.fn(),
    setFillColor: jest.fn(),
    text: jest.fn(),
    rect: jest.fn(),
    line: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  })),
}));
