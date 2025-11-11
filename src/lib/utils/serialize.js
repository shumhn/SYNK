/**
 * Serialize MongoDB documents for Next.js Client Components
 * 
 * Next.js 15 requires plain objects for client components.
 * This function converts MongoDB documents (with ObjectIds, Dates, etc.)
 * into plain JSON-serializable objects.
 * 
 * @param {any} obj - The object to serialize (can be a single doc, array, or any value)
 * @returns {any} - Plain JavaScript object safe for client components
 */
export function serializeForClient(obj) {
  if (!obj) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeForClient(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // Return primitives as-is
  return obj;
}

/**
 * Convert MongoDB ObjectId to string
 * Useful when you only need the ID as a string
 * 
 * @param {ObjectId} id - MongoDB ObjectId
 * @returns {string} - String representation of the ID
 */
export function idToString(id) {
  if (!id) return null;
  return id.toString();
}

/**
 * Serialize multiple values at once
 * 
 * @param {...any} values - Values to serialize
 * @returns {Array} - Array of serialized values
 */
export function serializeMultiple(...values) {
  return values.map(val => serializeForClient(val));
}
