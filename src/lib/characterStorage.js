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
  // Check for various Tauri environment indicators
  if (typeof window !== 'undefined') {
    // Check for Tauri global objects
    if (window.__TAURI__ || window.__TAURI_METADATA__ || window.__TAURI_INVOKE__) {
      return true;
    }
    
    // Check if we're in a webview (common in Tauri apps)
    if (window.navigator && window.navigator.userAgent && 
        window.navigator.userAgent.includes('Tauri')) {
      return true;
    }
  }
  
  // Check if Tauri APIs are available through imports
  try {
    return typeof invoke !== 'undefined' && typeof documentDir !== 'undefined';
  } catch {
    // If imports fail, check for alternative detection
    return typeof window !== 'undefined' && 
           (window.location.protocol === 'tauri:' || 
            window.location.hostname === 'tauri.localhost');
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
