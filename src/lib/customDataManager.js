/**
 * Custom D&D Data Manager with Auto-Detection
 * Automatically finds JSON files without needing manual index updates
 */

/**
 * Enhanced lookup function that tries API first, then auto-detects custom data
 * @param {string} name - The name to lookup
 * @param {string} type - Type of data ('backgrounds', 'classes', 'races', 'spells')
 * @param {string} apiEndpoint - The API endpoint to try first
 * @returns {Promise<{source: 'api'|'custom', data: any}|null>}
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
  
  // Try custom data with auto-detection
  const customData = await autoFindCustomData(name, type);
  if (customData) {
    return { source: 'custom', data: customData };
  }
  
  return null;
}

/**
 * Auto-find custom data by trying common filename patterns
 * @param {string} name
 * @param {string} type
 * @returns {Promise<any|null>}
 */
async function autoFindCustomData(name, type) {
  const formattedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Generate possible filenames to try
  const possibleFilenames = [
    `${formattedName}.json`,
    `${formattedName.replace(/-/g, '_')}.json`,
    `${formattedName.replace(/-/g, '')}.json`,
    `custom-${formattedName}.json`,
    `homebrew-${formattedName}.json`,
    `my-${formattedName}.json`
  ];
  
  // Try each possible filename
  for (const filename of possibleFilenames) {
    try {
      const response = await fetch(`/data/${type}/${filename}`);
      if (response.ok) {
        const data = await response.json();
        // Verify this is the right data by checking the name matches
        if (data.name && namesMatch(data.name, name)) {
          console.log(`✅ Found custom ${type.slice(0, -1)}: ${filename}`);
          return data;
        }
      }
    } catch (error) {
      // File doesn't exist or couldn't be parsed, continue to next
    }
  }
  
  return null;
}

/**
 * Check if two names match (flexible comparison)
 * @param {string} name1
 * @param {string} name2
 * @returns {boolean}
 */
function namesMatch(name1, name2) {
  const normalize = (/** @type {string} */ name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalize(name1) === normalize(name2);
}

/**
 * Load custom data index (backwards compatibility + auto-detection)
 * @returns {Promise<{backgrounds: any[], classes: any[], races: any[], spells: any[]}>}
 */
export async function loadCustomDataIndex() {
  try {
    const [backgrounds, classes, races, spells] = await Promise.all([
      scanCustomFiles('backgrounds'),
      scanCustomFiles('classes'),
      scanCustomFiles('races'),
      scanCustomFiles('spells')
    ]);
    
    return { backgrounds, classes, races, spells };
  } catch (error) {
    console.error('Error loading custom data:', error);
    return { backgrounds: [], classes: [], races: [], spells: [] };
  }
}

/**
 * Scan directory and return list of found files
 * @param {string} type
 * @returns {Promise<any[]>}
 */
async function scanCustomFiles(type) {
  const foundFiles = [];
  
  // First check if there's a static index
  try {
    const response = await fetch('/data/index.json');
    if (response.ok) {
      const index = await response.json();
      const staticFiles = (index)[type] || [];
      
      // Verify each file exists and add it
      for (const fileInfo of staticFiles) {
        try {
          const fileResponse = await fetch(`/data/${type}/${fileInfo.filename}`);
          if (fileResponse.ok) {
            const data = await fileResponse.json();
            foundFiles.push({
              name: data.name || fileInfo.name,
              filename: fileInfo.filename,
              description: fileInfo.description || `Custom ${type.slice(0, -1)}`,
              source: 'index'
            });
          }
        } catch (error) {
          console.warn(`File ${fileInfo.filename} in index but couldn't be loaded`);
        }
      }
    }
  } catch (error) {
    console.log('No static index found, scanning for files...');
  }
  
  // Also try to discover additional files by testing common patterns
  const commonNames = getCommonNamesForType(type);
  const existingFilenames = foundFiles.map(f => f.filename);
  
  for (const commonName of commonNames) {
    const filename = `${commonName}.json`;
    if (!existingFilenames.includes(filename)) {
      try {
        const response = await fetch(`/data/${type}/${filename}`);
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            foundFiles.push({
              name: data.name,
              filename: filename,
              description: `Auto-detected custom ${type.slice(0, -1)}`,
              source: 'auto-detected'
            });
          }
        }
      } catch (error) {
        // File doesn't exist, that's fine
      }
    }
  }
  
  return foundFiles;
}

/**
 * Get common names to check for each type
 * @param {string} type
 * @returns {string[]}
 */
function getCommonNamesForType(type) {
  const commonNames = {
    'backgrounds': ['chef', 'scholar', 'merchant', 'soldier', 'noble', 'criminal', 'folk-hero', 'hermit', 'entertainer'],
    'classes': ['artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin'],
    'races': ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'half-elf', 'half-orc'],
    'spells': ['fireball', 'healing-word', 'magic-missile', 'cure-wounds', 'shield', 'thunderwave']
  };
  
  if (type === 'backgrounds') return commonNames.backgrounds;
  if (type === 'classes') return commonNames.classes;
  if (type === 'races') return commonNames.races;
  if (type === 'spells') return commonNames.spells;
  return [];
}
