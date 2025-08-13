import { describe, it, expect } from 'vitest';
import { loadCharacters, saveCharacters, exportCharacters, importCharacters } from './characterStorage.js';

describe('characterStorage', () => {
  it('should save and load characters correctly', async () => {
    const testChars = [
      { name: 'Test1', class: 'Fighter', level: 1 },
      { name: 'Test2', class: 'Wizard', level: 2 }
    ];
    await saveCharacters(testChars);
    const loaded = await loadCharacters();
    expect(loaded).toEqual(testChars);
  });

  it('should export characters as JSON', () => {
    const testChars = [
      { name: 'Export1', class: 'Rogue', level: 3 }
    ];
    expect(() => exportCharacters(testChars, 'test-export.json')).not.toThrow();
  });

  it('should import characters from a file', async () => {
    const testChars = [{ name: 'Import1', class: 'Cleric', level: 4 }];
    const file = new Blob([
      JSON.stringify({ characters: testChars })
    ], { type: 'application/json' });
    const fakeFile = new File([file], 'import.json', { type: 'application/json' });
    // importCharacters returns a Promise with the imported characters
  const imported = await importCharacters(fakeFile);
  expect(imported).toEqual(testChars);
  });
});
