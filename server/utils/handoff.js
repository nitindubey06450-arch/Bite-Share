// server/utils/handoff.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a secure 4-digit numeric handoff code (e.g. "4921")
 */
const generateHandoffCode = () => {
  return crypto.randomInt(1000, 9999).toString();
};

/**
 * Hash a 4-digit handoff code using bcrypt
 */
const hashHandoffCode = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(code.toString(), salt);
};

/**
 * Verify handoff code against stored codeHash
 */
const verifyHandoffCode = async (code, codeHash) => {
  if (!code || !codeHash) return false;
  return await bcrypt.compare(code.toString(), codeHash);
};

module.exports = {
  generateHandoffCode,
  hashHandoffCode,
  verifyHandoffCode
};
