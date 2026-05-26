/**
 * game_logs/index.js
 *
 * LogEntry keeps public turn-log lines serialisable for the client.
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

module.exports = { LogEntry };