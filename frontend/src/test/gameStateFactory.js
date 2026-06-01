export function card(overrides = {}) {
  return {
    id: overrides.id || `${normalise(overrides.name || 'Card')}-1`,
    name: overrides.name || 'Rapid Incident Response',
    type: overrides.type || 'action',
    description: overrides.description || 'Test card description.',
    effectDescription: overrides.effectDescription || 'Test card effect.',
    deployTime: 0,
    baseDeployTime: 0,
    owner: 'Alice',
    lane: overrides.lane || null,
    laneLabel: overrides.laneLabel || null,
    category: overrides.category || null,
    hackerOnly: Boolean(overrides.hackerOnly),
    isHostile: Boolean(overrides.isHostile),
    sourceDeck: overrides.sourceDeck || 'security',
    submissionKind: overrides.submissionKind || (overrides.hackerOnly || overrides.type === 'attack' ? 'hacker' : 'security'),
    ...overrides,
  };
}

export function gameState({ viewer = 'Alice', viewerRole = 'SecEng', cards = [], task = null, system = {}, players = [] } = {}) {
  const basePlayers = [
    player({ name: viewer, role: viewerRole, cards, task }),
    player({ name: 'Bob', role: 'hidden', handSize: 3 }),
    player({ name: 'Cara', role: 'hidden', handSize: 4 }),
    player({ name: 'Dev', role: 'hidden', handSize: 2 }),
  ];

  return {
    turnNumber: 1,
    phase: 'playing',
    winner: null,
    endReason: null,
    votingExpired: false,
    voteProposal: null,
    voteUnlockTurn: 3,
    eliminated: [],
    spectators: [],
    viewerIsSpectator: false,
    system: {
      integrityPoints: 4,
      numTasksRemaining: 12,
      numTasksRequired: 12,
      numTasksCompleted: 0,
      evidence: 0,
      evidenceRevealThreshold: 5,
      hackerRevealed: false,
      defenceSlots: [
        { index: 0, state: 'empty', card: null },
        { index: 1, state: 'empty', card: null },
        { index: 2, state: 'empty', card: null },
      ],
      lanes: [
        { lane: 'credentials', label: 'Credentials', status: 'open', expectedDefence: 'Two-Factor Authentication' },
        { lane: 'social', label: 'Social', status: 'open', expectedDefence: 'Employee Awareness' },
        { lane: 'web', label: 'Web', status: 'open', expectedDefence: 'Input Sanitisation' },
        { lane: 'network', label: 'Network', status: 'open', expectedDefence: 'Anti-DDoS Defence' },
        { lane: 'physical', label: 'Physical', status: 'open', expectedDefence: 'Security Detail' },
      ],
      ...system,
    },
    players: players.length ? players : basePlayers,
  };
}

export function player({ name, role = 'hidden', cards = undefined, task = null, handSize = 0, submittedThisTurn = false } = {}) {
  return {
    name,
    role,
    handSize: cards ? cards.length : handSize,
    task,
    timePoints: 0,
    commPoints: 0,
    progPoints: 0,
    hasPlayedCards: false,
    canPlayCards: true,
    canPlayAttacks: true,
    mustDiscard: false,
    discardCount: 0,
    forcedDiscardCount: 0,
    awaitingDrawChoice: false,
    replacedTaskThisTurn: false,
    submittedThisTurn,
    submittedCardsThisTurn: submittedThisTurn ? [] : [],
    tasksCompleted: 0,
    isEliminated: false,
    isSpectator: false,
    cards,
  };
}

function normalise(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
