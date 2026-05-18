/**
 * game_logs/index.js
 *
 * LogEntry and PlayerLog — mirrors the Java game_logs package.
 * Entries are hidden (face-down) for attack/defence cards until revealed.
 */

class LogEntry {
  /**
   * @param {object} opts
   * @param {number}  opts.turnNum
   * @param {string}  opts.type        e.g. 'attack', 'defence', 'action', 'task', 'skill'
   * @param {string}  opts.name
   * @param {string}  opts.description
   * @param {boolean} opts.isHidden    true = show as "(Hidden)" to other players
   * @param {string}  opts.publicMessage optional preformatted public log line
   * @param {object}  opts.incidentEvent optional incident-report event
   */
  constructor({ turnNum, type, name, description, isHidden = false, publicMessage = null, incidentEvent = null }) {
    this.turnNum       = turnNum;
    this.type          = type;
    this.name          = name;
    this.description   = description;
    this.isHidden      = isHidden;
    this.publicMessage = publicMessage;
    this.incidentEvent = incidentEvent;
  }

  /** Human-readable string (mirrors Java prettyToString) */
  prettyToString() {
    if (this.isHidden) {
      return `| ${this.type.padEnd(10)} | ${'(Hidden)'.padEnd(15)} | ${'(Unknown)'.padEnd(15)} |`;
    }
    return `| ${this.type.padEnd(10)} | ${this.name.padEnd(15)} | ${this.description.padEnd(15)} |`;
  }

  /** Safe JSON for the client — hidden entries redact name/description */
  toJSON() {
    return {
      turnNum: this.turnNum,
      type:    this.type,
      name:        this.isHidden ? '(Hidden)'  : this.name,
      description: this.isHidden ? '(Unknown)' : this.description,
      isHidden: this.isHidden,
      publicMessage: this.publicMessage,
      incidentEvent: this.incidentEvent,
    };
  }
}

class PlayerLog {
  constructor() {
    /** @type {LogEntry[]} */
    this.logs = [];
  }

  /** @param {LogEntry} entry */
  add(entry) {
    this.logs.push(entry);
  }

  /** Returns entries for a given turn number */
  forTurn(turnNum) {
    return this.logs.filter(e => e.turnNum === turnNum);
  }

  toJSON() {
    return this.logs.map(e => e.toJSON());
  }
}

module.exports = { LogEntry, PlayerLog };