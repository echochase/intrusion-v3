const CARD_TEXT = {
  'Security Detail': {
    description: 'Hire a team of security guards to maintain physical security on campus and prevent theft.',
    effectDescription: 'Defends the Physical Lane. Blocks Physical Data Theft.',
  },
  'Employee Awareness': {
    description: 'Increase everyone’s cyber-awareness about what phishing attacks look like and how they operate!',
    effectDescription: 'Defends the Social Lane. Blocks Phishing.',
  },
  'Two-Factor Authentication': {
    description: 'Enforce 2-factor authentication. Nothing too fancy, just a temp code sent to your phone during login.',
    effectDescription: 'Defends the Credential Lane. Blocks Credential Theft.',
  },
  'Input Sanitisation': {
    description: 'Are you crazy? Sanitise the user input first before allowing it into your code! Escape, whitelist, do whatever it takes!',
    effectDescription: 'Defends the Web Lane. Blocks XSS Attack.',
  },
  'Anti-DDoS Defence': {
    description: 'Hire a DDoS Mitigation Service. Comes with traffic monitoring, behavioural analysis, WAFs, all the good stuff.',
    effectDescription: 'Defends the Network Lane. Blocks DDoS Attack.',
  },
  'Check Server Log': {
    description: 'Best to check the server log for any suspicious activities.',
    effectDescription: 'Choose a player. Check whether the card played by the target this turn is hostile.',
  },
  'Rapid Incident Response': {
    description: 'Prevention is better, but sometimes we need a quick cure to stop further damage!',
    effectDescription: 'Nullify an attack that is occurring in the same turn. DDoS attacks take priority.',
  },
  'Forensic Analysis': {
    description: 'Review access logs, packet trails, and system anomalies.',
    effectDescription: 'Gain 1 Evidence.',
  },
  'Threat Mitigation Protocol': {
    description: 'Review access logs, packet trails, and system anomalies.',
    effectDescription: 'Gain 1 Evidence.',
    displayName: 'Forensic Analysis',
  },
  'Zero-Day Attack': {
    description: 'Exploit a previously unknown vulnerability before the defenders have a patch, signature, or reliable way to recognise the threat.',
    effectDescription: 'Can only be played when the SecEng team is within 2 progress of completing the project. Deal 1 damage to system integrity. This attack cannot be blocked by lane defences.',
  },
  'Physical Data Theft': {
    description: 'Sneak into the tech department and steal sensitive information. Don’t get caught!',
    effectDescription: 'Removes 1 integrity point. Attacks the Physical Lane. Blocked by Security Detail.',
  },
  Phishing: {
    description: 'Send spam from a fake address. The more specific that you can make the spam, the more believable it is!',
    effectDescription: 'Removes 1 integrity point. Attacks the Social Lane. Blocked by Employee Awareness.',
  },
  'Credential Theft': {
    description: 'Look over a tech’s shoulder as they log in to the system. It’s easier if you’re friends.',
    effectDescription: 'Removes 1 integrity point. Attacks the Credential Lane. Blocked by Two-Factor Authentication.',
  },
  'XSS Attack': {
    description: 'Inject a malicious XSS payload into a vulnerable web application. Steal a couple session cookies.',
    effectDescription: 'Removes 1 integrity point. Attacks the Web Lane. Blocked by Input Sanitisation.',
  },
  'DDoS Attack': {
    description: 'Purchase a botnet and overwhelm the system with requests.',
    effectDescription: 'Until stopped, reduces the maximum processed actions per turn by 2. Attacks the Network Lane. Blocked by Anti-DDoS Defence.',
  },
  'False Flag': {
    description: 'Leave forged evidence in the logs.',
    effectDescription: 'Choose a player. The card they play this turn appears hostile.',
  },
  'Insider Sabotage': {
    description: 'Pay an intern to do a lousy job at defending the system. And to not ask questions.',
    effectDescription: 'Put this card in a defence slot. This card will occupy that slot until it is replaced.',
  },
  Reconnaissance: {
    description: 'Some passive recon never hurts.',
    effectDescription: 'At the end of the turn, privately view each player’s hand. This will not show up as a hostile action.',
  },
  'Server Maintenance': {
    description: 'Shut down the server for maintenance. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Network Lane must be protected.',
  },
  'Company Meeting': {
    description: 'Hold a company meeting to align the team on security priorities. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Social Lane must be protected.',
  },
  'Model Training': {
    description: 'Train and validate the web-facing model before deployment. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Web Lane must be protected.',
  },
  'Responsible Engineer': {
    description: 'Audit privileged account access. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Credentials Lane must be protected.',
  },
  'Hazard Report': {
    description: 'File a hazard report for physical risks around the workspace. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Physical Lane must be protected.',
  },
  'Corporate Announcement': {
    description: 'Publish a corporate announcement so staff know the current security expectations. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Social Lane must be protected.',
  },
  'Company Mixer Event': {
    description: 'Run a company mixer event to build trust and improve internal coordination. Grants 2 Progress Points.',
    effectDescription: 'To complete this card, the Social Lane and the Physical Lane must be protected.',
  },
  'Access Review': {
    description: 'Review user access lists and remove unnecessary credentials. Grants 2 Progress Points.',
    effectDescription: 'To complete this card, the Credentials Lane and the Web Lane must be protected.',
  },
  'Secure Build Review': {
    description: 'Review the latest web build for unsafe inputs and risky deployment changes. Grants 2 Progress Points.',
    effectDescription: 'To complete this card, the Web Lane and the Network Lane must be protected.',
  },
  'Office Lockup Audit': {
    description: 'Audit office lockup procedures and secure exposed workstations. Grants 1 Progress Point.',
    effectDescription: 'To complete this card, the Physical Lane must be protected.',
  },
};

export function cardTextFor(name) {
  return CARD_TEXT[name] || {};
}

export function enrichCardText(card) {
  if (!card) return card;
  const fallback = cardTextFor(card.name) || {};
  return {
    ...card,
    name: fallback.displayName || card.name,
    description: card.description || fallback.description || '',
    effectDescription: card.effectDescription || fallback.effectDescription || '',
  };
}

export default CARD_TEXT;
