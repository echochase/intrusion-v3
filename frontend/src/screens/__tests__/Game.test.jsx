import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Game } from '../Game.jsx';
import { MockSocket } from '../../test/mockSocket.js';
import { card, gameState } from '../../test/gameStateFactory.js';

function renderGame({ socket = new MockSocket(), name = 'Alice', state = gameState() } = {}) {
  const setRoom = vi.fn();

  render(
    <MemoryRouter initialEntries={[`/play/123456`]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/play/:roomCode" element={<Game socket={socket} name={name} room="123456" setRoom={setRoom} />} />
      </Routes>
    </MemoryRouter>,
  );

  socket.serverEmit('game-state', state);
  return { socket, setRoom };
}

describe('Game screen socket interactions', () => {
  it('requests private game state and can pass the turn', async () => {
    const socket = new MockSocket();
    renderGame({ socket });

    expect(socket.lastEmit('request-game-state')?.args[0]).toMatchObject({
      room: '123456',
      playerName: 'Alice',
    });

    fireEvent.click(await screen.findByRole('button', { name: /pass turn/i }));

    expect(socket.lastEmit('submit-cards')?.args[0]).toEqual({
      room: '123456',
      playerName: 'Alice',
      cardIds: [],
      cardOptions: {},
    });
  });

  it('stages a hand card and submits its id', async () => {
    const rapid = card({ id: 'rapid-1', name: 'Rapid Incident Response' });
    const socket = new MockSocket();
    renderGame({ socket, state: gameState({ cards: [rapid] }) });

    fireEvent.click(await screen.findByTitle(/Rapid Incident Response/i));

    expect(await screen.findByText(/Rapid Incident Response ×/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit card/i }));

    expect(socket.lastEmit('submit-cards')?.args[0]).toMatchObject({
      cardIds: ['rapid-1'],
      cardOptions: {},
    });
  });

  it('blocks Check Server Log staging when there is no Evidence', async () => {
    const logCard = card({ id: 'log-1', name: 'Check Server Log' });
    renderGame({ state: gameState({ cards: [logCard], system: { evidence: 0 } }) });

    fireEvent.click(await screen.findByTitle(/Check Server Log/i));

    expect(await screen.findByRole('status')).toHaveTextContent(/costs 1 Evidence/i);
    expect(screen.getByRole('button', { name: /pass turn/i })).toBeInTheDocument();
  });

  it('submits Check Server Log with the selected target in cardOptions', async () => {
    const logCard = card({ id: 'log-1', name: 'Check Server Log' });
    const socket = new MockSocket();
    renderGame({ socket, state: gameState({ cards: [logCard], system: { evidence: 1 } }) });

    fireEvent.click(await screen.findByTitle(/Check Server Log/i));
    fireEvent.change(await screen.findByLabelText(/log target/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /submit card/i }));

    expect(socket.lastEmit('submit-cards')?.args[0]).toMatchObject({
      cardIds: ['log-1'],
      cardOptions: {
        'log-1': { targetPlayerName: 'Bob' },
      },
    });
  });

  it('submits defence slot choices in cardOptions', async () => {
    const defence = card({
      id: 'defence-1',
      name: 'Employee Awareness',
      type: 'defence',
      lane: 'social',
      laneLabel: 'Social',
    });
    const socket = new MockSocket();
    renderGame({ socket, state: gameState({ cards: [defence] }) });

    fireEvent.click(await screen.findByTitle(/Employee Awareness/i));
    fireEvent.change(await screen.findByLabelText(/defence slot/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /submit card/i }));

    expect(socket.lastEmit('submit-cards')?.args[0]).toMatchObject({
      cardIds: ['defence-1'],
      cardOptions: {
        'defence-1': { defenceSlotIndex: 2 },
      },
    });
  });

  it('uses discard-cards when the player must discard', async () => {
    const cards = Array.from({ length: 6 }, (_, index) => card({ id: `card-${index}`, name: `Card ${index + 1}` }));
    const state = gameState({ cards });
    state.players[0].mustDiscard = true;
    state.players[0].discardCount = 1;
    const socket = new MockSocket();
    renderGame({ socket, state });

    fireEvent.click(await screen.findByTitle(/Card 1/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(socket.lastEmit('discard-cards')?.args[0]).toMatchObject({
      room: '123456',
      playerName: 'Alice',
      cardIds: ['card-0'],
    });
  });
});

describe('Game screen private reports', () => {
  it('opens the private Reconnaissance hand grid when recon-result arrives', async () => {
    const socket = new MockSocket();
    renderGame({ socket, name: 'Alice', state: gameState({ viewer: 'Alice', viewerRole: 'Hacker' }) });

    socket.serverEmit('recon-result', {
      ownerName: 'Alice',
      players: [
        { name: 'Alice', cards: [card({ id: 'a1', name: 'Reconnaissance' })] },
        { name: 'Bob', cards: [card({ id: 'b1', name: 'Employee Awareness', type: 'defence' })] },
        { name: 'Cara', cards: [] },
        { name: 'Dev', cards: [card({ id: 'd1', name: 'Credential Theft', type: 'attack', isHostile: true })] },
      ],
    });

    expect(await screen.findByRole('heading', { name: /player hands revealed/i })).toBeInTheDocument();
    const modal = screen.getByText(/private reconnaissance/i).closest('.recon-panel');
    expect(within(modal).getByText('Alice')).toBeInTheDocument();
    expect(within(modal).getByText('Bob')).toBeInTheDocument();
    expect(within(modal).getByText('Cara')).toBeInTheDocument();
    expect(within(modal).getByText('Dev')).toBeInTheDocument();
    expect(within(modal).getByText(/empty hand/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Credential Theft/i)).toBeInTheDocument();
  });
});
