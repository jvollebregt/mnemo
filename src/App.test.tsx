import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('opens on an empty contents page that invites a first poem', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'contents' })).toBeTruthy();
    expect(screen.getByText('Add a poem you want to know by heart.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'add a poem' })).toBeTruthy();
  });
});
