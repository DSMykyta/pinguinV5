// server/ai/errors.js

// =========================================================================
// AI ERROR TYPES
// =========================================================================
// Small typed errors used by the AI endpoint. Keeping them separate lets the
// route map expected input/config/provider failures to stable HTTP statuses.
// =========================================================================

class AiInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AiInputError';
    this.status = status;
  }
}

class AiConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiConfigError';
    this.status = 500;
  }
}

class AiProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
  }
}

module.exports = {
  AiConfigError,
  AiInputError,
  AiProviderError,
};
