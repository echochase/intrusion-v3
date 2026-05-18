/**
 * Core-mode constants for Intrusion.
 * Removed/expanded mechanics remain in their card files, but the live rules use
 * five visible security lanes.
 */

const Lane = Object.freeze({
  CREDENTIALS: 'credentials',
  SOCIAL: 'social',
  WEB: 'web',
  NETWORK: 'network',
  PHYSICAL: 'physical',
  SPECIAL: 'special',
});

const LaneLabels = Object.freeze({
  [Lane.CREDENTIALS]: 'Credentials',
  [Lane.SOCIAL]: 'Social',
  [Lane.WEB]: 'Web',
  [Lane.NETWORK]: 'Network',
  [Lane.PHYSICAL]: 'Physical',
  [Lane.SPECIAL]: 'Special',
});

const CoreDefenceByLane = Object.freeze({
  [Lane.CREDENTIALS]: 'Two-Factor Authentication',
  [Lane.SOCIAL]: 'Employee Awareness',
  [Lane.WEB]: 'Input Sanitisation',
  [Lane.NETWORK]: 'Anti-DDoS Defence',
  [Lane.PHYSICAL]: 'Security Detail',
});

const CoreAttackByLane = Object.freeze({
  [Lane.CREDENTIALS]: 'Credential Theft',
  [Lane.SOCIAL]: 'Phishing',
  [Lane.WEB]: 'XSS Attack',
  [Lane.NETWORK]: 'DDoS Attack',
  [Lane.PHYSICAL]: 'Physical Data Theft',
});

function laneLabel(lane) {
  return LaneLabels[lane] || 'Unknown';
}

function normaliseLane(lane) {
  const value = String(lane || '').toLowerCase();
  return Object.values(Lane).includes(value) ? value : null;
}

module.exports = {
  Lane,
  LaneLabels,
  CoreDefenceByLane,
  CoreAttackByLane,
  laneLabel,
  normaliseLane,
};
