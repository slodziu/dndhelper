/**
 * Auto-detection system for custom D&D data files
 * Scans directories and automatically builds index without manual maintenance
 */

/**
 * Scan a directory for JSON files by checking common patterns
 * @param {string} directory - Directory name (backgrounds, classes, races, spells)
 * @returns {Promise<Array<{name: string, filename: string, description: string}>>}
 */
async function scanDirectory(directory) {
  const detectedFiles = [];
  
  // First, get any files from the static index
  const staticIndex = await loadStaticIndex();
  const staticFiles = staticIndex[directory] || [];
  
  // Check all files listed in static index
  for (const fileInfo of staticFiles) {
    try {
      const response = await fetch(`/data/${directory}/${fileInfo.filename}`);
      if (response.ok) {
        const data = await response.json();
        detectedFiles.push({
          name: data.name || fileInfo.name,
          filename: fileInfo.filename,
          description: fileInfo.description || `Custom ${directory.slice(0, -1)}`,
          source: 'index'
        });
      }
    } catch (error) {
      console.warn(`File ${fileInfo.filename} listed in index but couldn't be loaded`);
    }
  }
  
  // Also scan for additional files that might not be in the index
  const additionalFiles = await scanForAdditionalFiles(directory, detectedFiles);
  detectedFiles.push(...additionalFiles);
  
  return detectedFiles;
}

/**
 * Scan for additional files not in the index
 * @param {string} directory
 * @param {Array} existingFiles
 * @returns {Promise<Array>}
 */
async function scanForAdditionalFiles(directory, existingFiles) {
  const additionalFiles = [];
  const existingFilenames = existingFiles.map(f => f.filename);
  
  // Common filename patterns to check
  const commonPatterns = getCommonPatterns(directory);
  
  for (const pattern of commonPatterns) {
    if (!existingFilenames.includes(pattern)) {
      try {
        const response = await fetch(`/data/${directory}/${pattern}`);
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            additionalFiles.push({
              name: data.name,
              filename: pattern,
              description: `Auto-detected custom ${directory.slice(0, -1)}`,
              source: 'auto-detected'
            });
          }
        }
      } catch (error) {
        // File doesn't exist or couldn't be parsed, skip it
      }
    }
  }
  
  return additionalFiles;
}

/**
 * Get common filename patterns to check for each directory
 * @param {string} directory
 * @returns {Array<string>}
 */
function getCommonPatterns(directory) {
  const patterns = [];
  
  // Add common D&D content patterns
  const commonNames = {
    'backgrounds': [
      'chef', 'scholar', 'merchant', 'soldier', 'noble', 'criminal', 'folk-hero',
      'hermit', 'entertainer', 'guild-artisan', 'outlander', 'sage', 'sailor',
      'acolyte', 'charlatan', 'knight', 'pirate', 'spy', 'gladiator'
    ],
    'classes': [
      'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
      'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'bloodhunter'
    ],
    'races': [
      'human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'half-elf',
      'half-orc', 'tiefling', 'aasimar', 'genasi', 'goliath', 'tabaxi'
    ],
    'spells': [
      'fireball', 'healing-word', 'magic-missile', 'cure-wounds', 'shield',
      'thunderwave', 'sleep', 'charm-person', 'detect-magic', 'light'
    ]
  };
  
  const names = commonNames[directory] || [];
  for (const name of names) {
    patterns.push(`${name}.json`);
    // Also try variations
    patterns.push(`${name.replace(/-/g, '_')}.json`);
    patterns.push(`${name.replace(/-/g, '')}.json`);
  }
  
  // Add some custom pattern variations
  const customPrefixes = ['custom-', 'my-', 'homebrew-'];
  for (const prefix of customPrefixes) {
    for (const name of names.slice(0, 5)) { // Just try first few with prefixes
      patterns.push(`${prefix}${name}.json`);
    }
  }
  
  return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Load static index as fallback
 * @returns {Promise<Object>}
 */
async function loadStaticIndex() {
  try {
    const response = await fetch('/data/index.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('No static index found, using auto-detection only');
  }
  return { backgrounds: [], classes: [], races: [], spells: [] };
}

/**
 * Auto-detect all custom data files
 * @returns {Promise<Object>}
 */
export async function autoDetectCustomData() {
  try {
    console.log('🔍 Auto-detecting custom D&D data files...');
    
    const [backgrounds, classes, races, spells] = await Promise.all([
      scanDirectory('backgrounds'),
      scanDirectory('classes'),
      scanDirectory('races'),
      scanDirectory('spells')
    ]);
    
    const result = { backgrounds, classes, races, spells };
    
    // Log what we found
    const totalFiles = backgrounds.length + classes.length + races.length + spells.length;
    console.log(`✅ Found ${totalFiles} custom data files:`, {
      backgrounds: backgrounds.length,
      classes: classes.length, 
      races: races.length,
      spells: spells.length
    });
    
    return result;
  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    return { backgrounds: [], classes: [], races: [], spells: [] };
  }
}

/**
 * Find custom data by name using auto-detection
 * @param {string} name
 * @param {string} type
 * @returns {Promise<Object|null>}
 */
export async function findCustomDataAuto(name, type) {
  const index = await autoDetectCustomData();
  const items = index[type] || [];
  
  // Format name for comparison
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
  try {
    const response = await fetch(`/data/${type}/${item.filename}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Failed to load ${item.filename}:`, error);
  }
  
  return null;
}
