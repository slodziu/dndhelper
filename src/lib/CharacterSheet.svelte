<script>
  import { onMount } from 'svelte';
  
  // Character field configuration - ADD NEW FIELDS HERE!
  const CHARACTER_FIELDS = {
    // Basic Info
    name: { type: 'text', default: '', label: 'Name', placeholder: 'Character Name' },
    level: { type: 'number', default: 1, label: 'Level', min: 1, max: 20 },
    class: { type: 'text', default: '', label: 'Class', placeholder: 'Fighter, Wizard, etc.' },
    race: { type: 'text', default: '', label: 'Race', placeholder: 'Human, Elf, etc.' },
    background: { type: 'text', default: '', label: 'Background', placeholder: 'Acolyte, Criminal, etc.' },
    
    // Complex fields
    stats: { 
      type: 'object', 
      default: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      }
    },
    hitPoints: { 
      type: 'object', 
      default: {
        current: 0,
        maximum: 0
      }
    },
    
    // Text areas
    notes: { type: 'textarea', default: '', label: 'Notes', placeholder: 'Write your character\'s backstory, campaign notes, or anything else here...' },
    fears: { type: 'textarea', default: '', label: 'Fears & Flaws', placeholder: 'What does your character fear? What are their flaws?' },
    
    // Arrays
    items: { type: 'array', default: [] },
    class_features: { type: 'array', default: [] },
    spells: { type: 'array', default: [] }
  };

  /**
   * Create default character from field configuration
   * @returns {Object}
   */
  function createDefaultCharacter() {
    const character = {};
    for (const [fieldName, config] of Object.entries(CHARACTER_FIELDS)) {
      character[fieldName] = structuredClone(config.default);
    }
    return character;
  }

  /**
   * Deep clone character data for saving
   * @param {Object} character
   * @returns {Object}
   */
  function cloneCharacterData(character) {
    const data = {};
    for (const [fieldName, config] of Object.entries(CHARACTER_FIELDS)) {
      if (config.type === 'array') {
        data[fieldName] = character[fieldName]?.map(item => ({ ...item })) || [];
      } else if (config.type === 'object') {
        data[fieldName] = { ...character[fieldName] };
      } else {
        data[fieldName] = character[fieldName];
      }
    }
    return data;
  }

  /**
   * Load character data with fallbacks
   * @param {Object} savedData
   * @returns {Object}
   */
  function loadCharacterData(savedData) {
    const character = {};
    for (const [fieldName, config] of Object.entries(CHARACTER_FIELDS)) {
      if (savedData[fieldName] !== undefined) {
        if (config.type === 'object') {
          character[fieldName] = { ...config.default, ...savedData[fieldName] };
        } else {
          character[fieldName] = savedData[fieldName];
        }
      } else {
        character[fieldName] = structuredClone(config.default);
      }
    }
    return character;
  }

  // Character sheet data
  let character = $state(createDefaultCharacter());

  // Saved characters management
  /** @type {Array<{id: string, name: string, data: any, savedAt: string}>} */
  let savedCharacters = $state([]);
  let selectedCharacterId = $state('');
  let showSaveDialog = $state(false);
  let saveCharacterName = $state('');

  /**
   * Calculate ability modifier
   * @param {number} score
   * @returns {number}
   */
  function getModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Format modifier with + or - sign
   * @param {number} modifier
   * @returns {string}
   */
  function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  /**
   * Load saved characters from localStorage
   */
  function loadSavedCharacters() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dnd-saved-characters');
      if (saved) {
        try {
          savedCharacters = JSON.parse(saved);
        } catch (error) {
          console.error('Error loading saved characters:', error);
          savedCharacters = [];
        }
      }
    }
  }

  /**
   * Save characters to localStorage
   */
  function saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnd-saved-characters', JSON.stringify(savedCharacters));
    }
  }

  /**
   * Generate unique ID for character
   * @returns {string}
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Open save dialog
   */
  function openSaveDialog() {
    if (selectedCharacterId) {
      // We're updating an existing character
      const existingCharacter = savedCharacters.find(c => c.id === selectedCharacterId);
      saveCharacterName = existingCharacter ? existingCharacter.name : character.name || '';
    } else {
      // We're creating a new character
      saveCharacterName = character.name || '';
    }
    showSaveDialog = true;
  }

  /**
   * Save current character
   */
  function saveCharacter() {
    if (!saveCharacterName.trim()) {
      alert('Please enter a character name');
      return;
    }

    const characterData = cloneCharacterData(character);

    // Check if we're updating an existing character
    if (selectedCharacterId) {
      const existingCharacterIndex = savedCharacters.findIndex(c => c.id === selectedCharacterId);
      if (existingCharacterIndex !== -1) {
        // Update existing character
        savedCharacters[existingCharacterIndex] = {
          ...savedCharacters[existingCharacterIndex],
          name: saveCharacterName.trim(),
          data: characterData,
          savedAt: new Date().toISOString()
        };
        // Trigger reactivity
        savedCharacters = [...savedCharacters];
      } else {
        // If character not found (shouldn't happen), create new one
        const newCharacter = {
          id: generateId(),
          name: saveCharacterName.trim(),
          data: characterData,
          savedAt: new Date().toISOString()
        };
        savedCharacters = [...savedCharacters, newCharacter];
        selectedCharacterId = newCharacter.id;
      }
    } else {
      // Create new character
      const newCharacter = {
        id: generateId(),
        name: saveCharacterName.trim(),
        data: characterData,
        savedAt: new Date().toISOString()
      };
      savedCharacters = [...savedCharacters, newCharacter];
      selectedCharacterId = newCharacter.id;
    }

    saveToStorage();
    showSaveDialog = false;
    saveCharacterName = '';
  }

  /**
   * Load selected character
   * @param {Event} event
   */
  function loadCharacter(event) {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    const characterId = target?.value || '';
    selectedCharacterId = characterId;
    
    if (characterId) {
      const savedChar = savedCharacters.find(c => c.id === characterId);
      if (savedChar) {
        // Use the loadCharacterData function for consistent loading
        character = loadCharacterData(savedChar.data);
      }
    }
  }

  /**
   * Delete character
   * @param {string} characterId
   */
  function deleteCharacter(characterId) {
    const characterToDelete = savedCharacters.find(c => c.id === characterId);
    
    if (characterToDelete && confirm(`Are you sure you want to delete "${characterToDelete.name}"?`)) {
      savedCharacters = savedCharacters.filter(c => c.id !== characterId);
      saveToStorage();
      
      // Clear selection if deleted character was selected
      if (selectedCharacterId === characterId) {
        selectedCharacterId = '';
      }
    }
  }

  /**
   * Create new character
   */
  function newCharacter() {
    if (character.name || character.class || character.race) {
      if (!confirm('Are you sure you want to create a new character? Unsaved changes will be lost.')) {
        return;
      }
    }
    
    character = createDefaultCharacter();
    selectedCharacterId = '';
  }

  /**
   * Cancel save dialog
   */
  function cancelSave() {
    showSaveDialog = false;
    saveCharacterName = '';
  }

  /**
   * Add new item
   */
  function addItem() {
    character.items.push({ name: '', quantity: 1, description: '' });
    character = character; // Trigger reactivity
  }

  /**
   * Remove item
   * @param {number} index
   */
  function removeItem(index) {
    character.items.splice(index, 1);
    character = character; // Trigger reactivity
  }

  /**
   * Add new spell
   */
  function addSpell() {
    character.spells.push({ name: '', level: 1, school: '', description: '' });
    character = character; // Trigger reactivity
  }

  /**
   * Remove spell
   * @param {number} index
   */
  function removeSpell(index) {
    character.spells.splice(index, 1);
    character = character; // Trigger reactivity
  }

  // Load saved characters when component mounts
  onMount(() => {
    loadSavedCharacters();
  });
</script>

<div class="character-sheet">
  <!-- Character Management Section -->
  <div class="character-management">
    <div class="management-controls">
      <div class="load-section">
        <label for="character-select">Load Character:</label>
        <select id="character-select" bind:value={selectedCharacterId} onchange={loadCharacter}>
          <option value="">-- Select Character --</option>
          {#each savedCharacters as savedChar}
            <option value={savedChar.id}>{savedChar.name}</option>
          {/each}
        </select>
        {#if selectedCharacterId}
          <button 
            class="delete-btn" 
            onclick={() => deleteCharacter(selectedCharacterId)}
            title="Delete selected character"
          >
            🗑️
          </button>
        {/if}
      </div>
      
      <div class="action-buttons">
        <button class="new-btn" onclick={newCharacter}>New Character</button>
        <button class="save-btn" onclick={openSaveDialog}>{selectedCharacterId ? 'Update Character' : 'Save Character'}</button>
      </div>
    </div>
  </div>

  <div class="character-header">
    <h3>Character Sheet</h3>
    <div class="basic-info">
      {#each Object.entries(CHARACTER_FIELDS) as [fieldName, config]}
        {#if config.type === 'text' || config.type === 'number'}
          <div class="input-group">
            <label for="char-{fieldName}">{config.label}:</label>
            {#if config.type === 'text'}
              <input 
                id="char-{fieldName}" 
                type="text" 
                bind:value={character[fieldName]} 
                placeholder={config.placeholder || ''}
              />
            {:else if config.type === 'number'}
              <input 
                id="char-{fieldName}" 
                type="number" 
                bind:value={character[fieldName]} 
                min={config.min || ''}
                max={config.max || ''}
              />
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <div class="stats-section">
    <h4>Ability Scores</h4>
    <div class="stats-grid">
      {#each Object.entries(character.stats) as [stat, score], index}
        <div class="stat-block">
          <label class="stat-name" for="stat-{stat}">{stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
          <input 
            id="stat-{stat}"
            type="number" 
            bind:value={character.stats[/** @type {keyof typeof character.stats} */ (stat)]} 
            min="1" 
            max="20"
            class="stat-score"
          >
          <span class="stat-modifier">{formatModifier(getModifier(score))}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="hp-section">
    <h4>Hit Points</h4>
    <div class="hp-inputs">
      <div class="input-group">
        <label for="current-hp">Current HP:</label>
        <input 
          id="current-hp" 
          type="number" 
          bind:value={character.hitPoints.current} 
          min="0"
          max={character.hitPoints.maximum}
        >
      </div>
      <div class="input-group">
        <label for="max-hp">Maximum HP:</label>
        <input 
          id="max-hp" 
          type="number" 
          bind:value={character.hitPoints.maximum} 
          min="1"
        >
      </div>
    </div>
  </div>

  <!-- Items Section -->
  <div class="items-section">
    <div class="section-header">
      <h4>Items & Equipment</h4>
      <button class="add-btn" onclick={() => addItem()}>+ Add Item</button>
    </div>
    {#if character.items.length === 0}
      <p class="empty-message">No items added yet.</p>
    {:else}
      <div class="items-list">
        {#each character.items as item, index}
          <div class="item-row">
            <div class="item-inputs">
              <input 
                type="text" 
                bind:value={item.name} 
                placeholder="Item name"
                class="item-name"
              >
              <input 
                type="number" 
                bind:value={item.quantity} 
                min="1"
                class="item-quantity"
                placeholder="Qty"
              >
              <input 
                type="text" 
                bind:value={item.description} 
                placeholder="Description"
                class="item-description"
              >
            </div>
            <button class="remove-btn" onclick={() => removeItem(index)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Spells Section -->
  <div class="spells-section">
    <div class="section-header">
      <h4>Spells</h4>
      <button class="add-btn" onclick={() => addSpell()}>+ Add Spell</button>
    </div>
    {#if character.spells.length === 0}
      <p class="empty-message">No spells added yet.</p>
    {:else}
      <div class="spells-list">
        {#each character.spells as spell, index}
          <div class="spell-row">
            <div class="spell-inputs">
              <input 
                type="text" 
                bind:value={spell.name} 
                placeholder="Spell name"
                class="spell-name"
              >
              <input 
                type="number" 
                bind:value={spell.level} 
                min="0"
                max="9"
                class="spell-level"
                placeholder="Lvl"
              >
              <input 
                type="text" 
                bind:value={spell.school} 
                placeholder="School (e.g., Evocation)"
                class="spell-school"
              >
              <input 
                type="text" 
                bind:value={spell.description} 
                placeholder="Description"
                class="spell-description"
              >
            </div>
            <button class="remove-btn" onclick={() => removeSpell(index)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Dynamic Text Area Sections -->
  {#each Object.entries(CHARACTER_FIELDS) as [fieldName, config]}
    {#if config.type === 'textarea'}
      <div class="notes-section">
        <h4>{config.label}</h4>
        <textarea 
          bind:value={character[fieldName]}
          placeholder={config.placeholder || ''}
          class="notes-textarea"
        ></textarea>
      </div>
    {/if}
  {/each}
</div>

<!-- Save Dialog -->
{#if showSaveDialog}
  <div class="save-dialog-backdrop" onclick={cancelSave} role="button" tabindex="0" onkeydown={(e) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && cancelSave()}>
    <div class="save-dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <h4>{selectedCharacterId ? 'Update Character' : 'Save New Character'}</h4>
      <div class="save-form">
        <label for="save-name">Character Name:</label>
        <input 
          id="save-name"
          type="text" 
          bind:value={saveCharacterName} 
          placeholder="Enter character name"
          onkeydown={(e) => e.key === 'Enter' && saveCharacter()}
        >
        <div class="save-buttons">
          <button class="cancel-btn" onclick={cancelSave}>Cancel</button>
          <button class="confirm-save-btn" onclick={saveCharacter}>{selectedCharacterId ? 'Update' : 'Save'}</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .character-sheet {
    max-width: 800px;
    margin: 0 auto;
  }

  /* Character Management Section */
  .character-management {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    background: #f0f8f0;
  }

  .management-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .load-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .load-section label {
    font-weight: 600;
    color: #333;
    white-space: nowrap;
  }

  .load-section select {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .new-btn, .save-btn {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .new-btn {
    background-color: #2196F3;
    color: white;
  }

  .new-btn:hover {
    background-color: #1976D2;
  }

  .save-btn {
    background-color: #4CAF50;
    color: white;
  }

  .save-btn:hover {
    background-color: #45a049;
  }

  .delete-btn {
    padding: 0.5rem;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    background-color: #d32f2f;
  }

  /* Save Dialog */
  .save-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .save-dialog {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 400px;
  }

  .save-dialog h4 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .save-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .save-form label {
    font-weight: 500;
    color: #333;
  }

  .save-form input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .save-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .cancel-btn, .confirm-save-btn {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn {
    background-color: #757575;
    color: white;
  }

  .cancel-btn:hover {
    background-color: #616161;
  }

  .confirm-save-btn {
    background-color: #4CAF50;
    color: white;
  }

  .confirm-save-btn:hover {
    background-color: #45a049;
  }

  .character-header {
    margin-bottom: 2rem;
  }

  .character-header h3 {
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .basic-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .input-group label {
    font-weight: 500;
    color: #333;
  }

  .input-group input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .stats-section, .hp-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
  }

  .stats-section h4, .hp-section h4 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
  }

  .stat-name {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .stat-score {
    width: 60px;
    text-align: center;
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .stat-modifier {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .hp-inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  /* Items, Spells, and Notes Sections */
  .items-section, .spells-section, .notes-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h4 {
    margin: 0;
    color: #333;
  }

  .add-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .add-btn:hover {
    background-color: #45a049;
  }

  .empty-message {
    color: #666;
    font-style: italic;
    text-align: center;
    margin: 2rem 0;
  }

  /* Items */
  .items-list, .spells-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-row, .spell-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .item-inputs, .spell-inputs {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    flex-wrap: wrap;
  }

  .item-name, .spell-name {
    flex: 2;
    min-width: 150px;
  }

  .item-quantity, .spell-level {
    width: 60px;
    flex: none;
  }

  .item-description, .spell-description {
    flex: 3;
    min-width: 200px;
  }

  .spell-school {
    flex: 1;
    min-width: 120px;
  }

  .item-inputs input, .spell-inputs input {
    padding: 0.4rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 0.9rem;
  }

  .remove-btn {
    background-color: #f44336;
    color: white;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex: none;
  }

  .remove-btn:hover {
    background-color: #d32f2f;
  }

  /* Notes */
  .notes-section h4 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .notes-textarea {
    width: 100%;
    min-height: 120px;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .character-management {
      background-color: #1a4a1a;
      border-color: #4CAF50;
    }

    .load-section label {
      color: #f6f6f6;
    }

    .load-section select {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .save-dialog {
      background-color: #2f2f2f;
      color: #f6f6f6;
    }

    .save-dialog h4 {
      color: #f6f6f6;
    }

    .save-form label {
      color: #f6f6f6;
    }

    .save-form input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .input-group label {
      color: #f6f6f6;
    }

    .input-group input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .stats-section, .hp-section {
      background-color: #2f2f2f;
      border-color: #555;
    }

    .items-section, .spells-section, .notes-section {
      background-color: #2f2f2f;
      border-color: #555;
    }

    .section-header h4, .notes-section h4 {
      color: #f6f6f6;
    }

    .empty-message {
      color: #ccc;
    }

    .item-row, .spell-row {
      background-color: #404040;
      border-color: #666;
    }

    .item-inputs input, .spell-inputs input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .notes-textarea {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .stats-section h4, .hp-section h4 {
      color: #f6f6f6;
    }

    .stat-block {
      background-color: #404040;
      border-color: #666;
    }

    .stat-name {
      color: #ccc;
    }

    .stat-modifier {
      color: #ccc;
    }
  }
</style>
