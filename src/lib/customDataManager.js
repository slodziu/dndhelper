/**
 * Custom D&D Data Manager
 * Handles loading and managing custom D&D data from local JSON files
 */

/**
 * Load custom data index
 * @returns {Promise<Object>}
 */
export async function loadCustomDataIndex() {
  try {
    const response = await fetch('/data/index.json');
    if (!response.ok) {
      throw new Error('Failed to load custom data index');
    }
    return await response.json();
  } catch (error) {
    console.warn('Custom data index not found, using empty index');
    return { backgrounds: [], classes: [], races: [], spells: [] };
  }
}

/**
 * Load custom background data
 * @param {string} filename
 * @returns {Promise<Object|null>}
 */
export async function loadCustomBackground(filename) {
  try {
    const response = await fetch(`/data/backgrounds/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load background: ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading custom background:', error);
    return null;
  }
}

/**
 * Load custom class data
 * @param {string} filename
 * @returns {Promise<Object|null>}
 */
export async function loadCustomClass(filename) {
  try {
    const response = await fetch(`/data/classes/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load class: ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading custom class:', error);
    return null;
  }
}

/**
 * Load custom race data
 * @param {string} filename
 * @returns {Promise<Object|null>}
 */
export async function loadCustomRace(filename) {
  try {
    const response = await fetch(`/data/races/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load race: ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading custom race:', error);
    return null;
  }
}

/**
 * Load custom spell data
 * @param {string} filename
 * @returns {Promise<Object|null>}
 */
export async function loadCustomSpell(filename) {
  try {
    const response = await fetch(`/data/spells/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load spell: ${filename}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading custom spell:', error);
    return null;
  }
}

/**
 * Find custom data by name
 * @param {string} name - The name to search for
 * @param {string} type - Type of data ('backgrounds', 'classes', 'races', 'spells')
 * @returns {Promise<Object|null>}
 */
export async function findCustomData(name, type) {
  const index = await loadCustomDataIndex();
  const items = index[type] || [];
  
  // Format name for comparison (lowercase, replace spaces with dashes, remove special chars)
  const formattedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Find item by formatted name comparison
  const item = items.find(item => {
    const itemFormattedName = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return itemFormattedName === formattedName;
  });
  
  if (!item) {
    return null;
  }
  
  // Load the actual data
  switch (type) {
    case 'backgrounds':
      return await loadCustomBackground(item.filename);
    case 'classes':
      return await loadCustomClass(item.filename);
    case 'races':
      return await loadCustomRace(item.filename);
    case 'spells':
      return await loadCustomSpell(item.filename);
    default:
      return null;
  }
}

/**
 * Enhanced lookup function that tries API first, then custom data
 * @param {string} name - The name to lookup
 * @param {string} type - Type of data ('backgrounds', 'classes', 'races', 'spells')
 * @param {string} apiEndpoint - The API endpoint to try first
 * @returns {Promise<{source: 'api'|'custom', data: Object}|null>}
 */
export async function enhancedLookup(name, type, apiEndpoint) {
  // Format name for API
  const formattedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Try API first
  try {
    const response = await fetch(`https://www.dnd5eapi.co/api/${apiEndpoint}/${formattedName}`);
    if (response.ok) {
      const data = await response.json();
      return { source: 'api', data };
    }
  } catch (error) {
    console.log(`API lookup failed for ${name}, trying custom data...`);
  }
  
  // Try custom data
  const customData = await findCustomData(name, type);
  if (customData) {
    return { source: 'custom', data: customData };
  }
  
  return null;
}
