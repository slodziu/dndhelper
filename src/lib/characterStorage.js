/**
 * Character Storage Module
 * Handles persistent storage of character data using Tauri's file system API
 * Falls back to localStorage for web builds
 */

import { invoke } from '@tauri-apps/api/core';
import { documentDir, homeDir, join } from '@tauri-apps/api/path';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';

const CHARACTERS_FILE = 'characters.json';
const BACKUP_KEY = 'dnd-saved-characters';
const DND_FOLDER = 'DnD Helper';

/**
 * Check if we're running in Tauri
 */
function isTauri() {
  // Quick check for web environment first
  if (typeof window !== 'undefined' && 
      (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    return false;
  }
  
  // Check if Tauri APIs are actually available and callable
  try {
    // Test if we can access the Tauri APIs without errors
    if (typeof invoke === 'undefined' || typeof documentDir === 'undefined') {
      return false;
    }
    
    // Additional check for Tauri environment
    if (typeof window !== 'undefined') {
      return window.location.protocol === 'tauri:' || 
             window.location.hostname === 'tauri.localhost' ||
             !!window['__TAURI__'] ||
             !!window['__TAURI_METADATA__'];
    }
    
    return true;
  } catch (error) {
    console.log('Tauri API check failed:', error.message);
    return false;
  }
}

/**
 * Get the full path to the characters file
 */
async function getCharactersFilePath() {
  try {
    // Try Documents directory first
    const documentsPath = await documentDir();
    const dndFolderPath = await join(documentsPath, DND_FOLDER);
    return await join(dndFolderPath, CHARACTERS_FILE);
  } catch (error) {
    // Fallback to home directory
    console.warn('Could not access Documents directory, using home directory:', error);
    const homePath = await homeDir();
    const dndFolderPath = await join(homePath, DND_FOLDER);
    return await join(dndFolderPath, CHARACTERS_FILE);
  }
}

/**
 * Ensure the DnD Helper directory exists
 */
async function ensureDndHelperDir() {
  try {
    const filePath = await getCharactersFilePath();
    const folderPath = filePath.replace('/' + CHARACTERS_FILE, '').replace('\\' + CHARACTERS_FILE, '');
    const dirExists = await exists(folderPath);
    if (!dirExists) {
      await mkdir(folderPath, { recursive: true });
      console.log('Created DnD Helper directory:', folderPath);
    }
    return folderPath;
  } catch (error) {
    console.warn('Could not create DnD Helper directory:', error);
    throw error;
  }
}

/**
 * Load characters from persistent storage
 * @returns {Promise<Array>} Array of saved characters
 */
export async function loadCharacters() {
  if (isTauri()) {
    try {
      await ensureDndHelperDir();
      const filePath = await getCharactersFilePath();
      const fileExists = await exists(filePath);
      
      if (fileExists) {
        const content = await readTextFile(filePath);
        const characters = JSON.parse(content);
        console.log(`Loaded ${characters.length} characters from:`, filePath);
        return characters;
      } else {
        console.log('Characters file does not exist yet. Path will be:', filePath);
        return [];
      }
    } catch (error) {
      console.error('Error loading characters from file:', error);
      
      // Fallback to localStorage if file reading fails
      console.log('Falling back to localStorage...');
      return loadFromLocalStorage();
    }
  } else {
    // Web build - use localStorage
    return loadFromLocalStorage();
  }
}

/**
 * Save characters to persistent storage
 * @param {Array} characters - Array of character objects to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveCharacters(characters) {
  if (isTauri()) {
    try {
      const folderPath = await ensureDndHelperDir();
      const filePath = await getCharactersFilePath();
      const content = JSON.stringify(characters, null, 2);
      
      await writeTextFile(filePath, content);
      console.log(`Saved ${characters.length} characters to:`, filePath);
      console.log('You can find your characters at:', folderPath);
      
      // Also backup to localStorage as a fallback
      saveToLocalStorage(characters);
      
      return true;
    } catch (error) {
      console.error('Error saving characters to file:', error);
      
      // Fallback to localStorage if file writing fails
      console.log('Falling back to localStorage...');
      return saveToLocalStorage(characters);
    }
  } else {
    // Web build - use localStorage
    return saveToLocalStorage(characters);
  }
}

/**
 * Save a single character by updating the character list
 * @param {Object} character - Character object to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveCharacter(character) {
  try {
    // Load existing characters
    const characters = await loadCharacters();
    
    // Try multiple matching strategies to find the existing character
    let existingIndex = -1;
    
    // Strategy 1: Exact name match
    existingIndex = characters.findIndex(c => c.name === character.name);
    
    // Strategy 2: If no exact match, try to match based on partial name
    // This handles cases like "Garb (Tamta)" vs "Garb"
    if (existingIndex === -1 && character.name) {
      // Try matching where the character name is contained in the stored name
      existingIndex = characters.findIndex(c => {
        if (!c.name || !character.name) return false;
        
        // Check if the character name is a substring of the stored name
        // This handles "Garb" matching "Garb (Tamta)"
        if (c.name.includes(character.name) || character.name.includes(c.name)) {
          console.log(`Found partial name match: "${character.name}" matches "${c.name}"`);
          return true;
        }
        
        // Also try removing parentheses and extra info for comparison
        const storedBase = c.name.split('(')[0].trim();
        const charBase = character.name.split('(')[0].trim();
        if (storedBase === charBase) {
          console.log(`Found base name match: "${charBase}" from "${character.name}" matches "${c.name}"`);
          return true;
        }
        
        return false;
      });
    }
    
    if (existingIndex >= 0) {
      // Update existing character but preserve the original name
      const originalName = characters[existingIndex].name;
      console.log(`Updating existing character: "${originalName}" (was saving as "${character.name}")`);
      
      // Update the character but keep the original name to maintain consistency
      characters[existingIndex] = { ...character, name: originalName };
    } else {
      // Add new character
      console.log(`Adding new character: "${character.name}"`);
      characters.push(character);
    }
    
    // Save the updated character list
    return await saveCharacters(characters);
  } catch (error) {
    console.error('Error saving character:', error);
    return false;
  }
}

/**
 * Export characters to a downloadable file
 * @param {Array} characters - Characters to export
 * @param {string} filename - Optional filename
 */
/**
 * Export characters to a downloadable file
 * @param {Array} characters - Characters to export
 * @param {string} filename - Optional filename
 */
export async function exportCharacters(characters, filename = null) {
  const timestamp = new Date().toISOString().split('T')[0];
  const exportFilename = filename || `dnd-characters-backup-${timestamp}.json`;
  
  const data = JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    characters: characters
  }, null, 2);

  // Use web download method (works in both web and desktop apps)
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  console.log(`Exported ${characters.length} characters to ${exportFilename}`);
  return true;
}

/**
 * Import characters from a file
 * @param {File} file - File object to import from
 * @returns {Promise<Array>} Imported characters
 */
export function importCharacters(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Handle both old format (direct array) and new format (with metadata)
        const characters = data.characters || data;
        
        if (!Array.isArray(characters)) {
          throw new Error('Invalid file format: expected array of characters');
        }
        
        console.log(`Imported ${characters.length} characters from file`);
        resolve(characters);
      } catch (error) {
        console.error('Error importing characters:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Fallback: Load from localStorage
 */
function loadFromLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(BACKUP_KEY);
      if (saved) {
        const characters = JSON.parse(saved);
        console.log(`Loaded ${characters.length} characters from localStorage`);
        return characters;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
  return [];
}

/**
 * Fallback: Save to localStorage
 */
function saveToLocalStorage(characters) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(characters));
      console.log(`Saved ${characters.length} characters to localStorage`);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get storage information for debugging
 */
export async function getStorageInfo() {
  const info = {
    platform: isTauri() ? 'tauri' : 'web',
    timestamp: new Date().toISOString()
  };
  
  if (isTauri()) {
    try {
      const filePath = await getCharactersFilePath();
      const fileExists = await exists(filePath);
      info.filePath = filePath;
      info.fileExists = fileExists;
    } catch (error) {
      info.error = error.message;
    }
  }
  
  return info;
}
