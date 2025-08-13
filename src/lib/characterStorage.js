/**
 * Character Storage Module
 * Handles persistent storage of character data using Tauri's file system API
 * Falls back to localStorage for web builds
 */

import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';

const CHARACTERS_FILE = 'characters.json';
const BACKUP_KEY = 'dnd-saved-characters';

/**
 * Check if we're running in Tauri
 */
function isTauri() {
  return typeof window !== 'undefined' && window.__TAURI__;
}

/**
 * Get the full path to the characters file
 */
async function getCharactersFilePath() {
  const appDataPath = await appDataDir();
  return await join(appDataPath, CHARACTERS_FILE);
}

/**
 * Ensure the app data directory exists
 */
async function ensureAppDataDir() {
  try {
    const appDataPath = await appDataDir();
    const dirExists = await exists(appDataPath);
    if (!dirExists) {
      await mkdir(appDataPath, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create app data directory:', error);
  }
}

/**
 * Load characters from persistent storage
 * @returns {Promise<Array>} Array of saved characters
 */
export async function loadCharacters() {
  if (isTauri()) {
    try {
      await ensureAppDataDir();
      const filePath = await getCharactersFilePath();
      const fileExists = await exists(filePath);
      
      if (fileExists) {
        const content = await readTextFile(filePath);
        const characters = JSON.parse(content);
        console.log(`Loaded ${characters.length} characters from file`);
        return characters;
      } else {
        console.log('Characters file does not exist yet');
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
      await ensureAppDataDir();
      const filePath = await getCharactersFilePath();
      const content = JSON.stringify(characters, null, 2);
      
      await writeTextFile(filePath, content);
      console.log(`Saved ${characters.length} characters to file`);
      
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
export function exportCharacters(characters, filename = null) {
  const timestamp = new Date().toISOString().split('T')[0];
  const exportFilename = filename || `dnd-characters-backup-${timestamp}.json`;
  
  const data = JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    characters: characters
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename;
  a.click();
  
  URL.revokeObjectURL(url);
  console.log(`Exported ${characters.length} characters to ${exportFilename}`);
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
