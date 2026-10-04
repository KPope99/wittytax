import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the WittyTax brand name', () => {
  render(<App />);
  const elements = screen.getAllByText(/WittyTax/i);
  expect(elements.length).toBeGreaterThan(0);
});

test('renders at least one Get Started button', () => {
  render(<App />);
  const buttons = screen.getAllByText(/Get Started/i);
  expect(buttons.length).toBeGreaterThan(0);
});

test('renders the Login button in the nav', () => {
  render(<App />);
  const buttons = screen.getAllByText(/Login/i);
  expect(buttons.length).toBeGreaterThan(0);
});
