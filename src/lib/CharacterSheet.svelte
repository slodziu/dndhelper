<script>
  import { onMount } from 'svelte';
  import { enhancedLookup } from './customDataManager.js';
  
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
  
  // API integration state
  let showApiPopup = $state(false);
  let apiData = $state(null);
  let apiLoading = $state(false);
  let apiError = $state('');

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
   * D&D 5e API Integration
   */
  
  /**
   * Format string for API lookup (lowercase, replace spaces with dashes)
   * @param {string} name
   * @returns {string}
   */
  function formatForApi(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Lookup spell details from D&D 5e API
   * @param {string} spellName
   * @param {number} spellIndex - Index of the spell in the character's spell list
   */
  async function lookupSpell(spellName, spellIndex = -1) {
    if (!spellName.trim()) return;
    
    apiLoading = true;
    apiError = '';
    apiData = null;
    showApiPopup = true;
    
    try {
      const formattedName = formatForApi(spellName.trim());
      const response = await fetch(`https://www.dnd5eapi.co/api/spells/${formattedName}`);
      
      if (!response.ok) {
        throw new Error(`Spell "${spellName}" not found in D&D 5e API`);
      }
      
      const data = await response.json();
      apiData = {
        type: 'spell',
        name: data.name,
        level: data.level,
        school: data.school?.name || '',
        castingTime: data.casting_time,
        range: data.range,
        components: data.components?.join(', ') || '',
        duration: data.duration,
        description: data.desc?.join('\n\n') || '',
        higherLevel: data.higher_level?.join('\n\n') || '',
        classes: data.classes?.map(c => c.name).join(', ') || '',
        spellIndex: spellIndex // Store the index for auto-population
      };
    } catch (error) {
      apiError = error.message;
    } finally {
      apiLoading = false;
    }
  }

  /**
   * Lookup class details from D&D 5e API
   * @param {string} className
   */
  async function lookupClass(className) {
    if (!className.trim()) return;
    
    apiLoading = true;
    apiError = '';
    apiData = null;
    showApiPopup = true;
    
    try {
      const formattedName = formatForApi(className.trim());
      const response = await fetch(`https://www.dnd5eapi.co/api/classes/${formattedName}`);
      
      if (!response.ok) {
        throw new Error(`Class "${className}" not found in D&D 5e API`);
      }
      
      const data = await response.json();
      apiData = {
        type: 'class',
        name: data.name,
        hitDie: data.hit_die,
        primaryAbility: data.saving_throws?.map(st => st.name).join(', ') || '',
        proficiencies: data.proficiencies?.map(p => p.name).join(', ') || '',
        proficiencyChoices: data.proficiency_choices?.map(pc => 
          `Choose ${pc.choose} from: ${pc.from?.options?.map(opt => opt.item?.name || opt.choice?.from?.options?.map(o => o.item?.name).join(', ')).join(', ')}`
        ).join('\n') || ''
      };
    } catch (error) {
      apiError = error.message;
    } finally {
      apiLoading = false;
    }
  }

  /**
   * Lookup race details from D&D 5e API
   * @param {string} raceName
   */
  async function lookupRace(raceName) {
    if (!raceName.trim()) return;
    
    apiLoading = true;
    apiError = '';
    apiData = null;
    showApiPopup = true;
    
    try {
      const formattedName = formatForApi(raceName.trim());
      const response = await fetch(`https://www.dnd5eapi.co/api/races/${formattedName}`);
      
      if (!response.ok) {
        throw new Error(`Race "${raceName}" not found in D&D 5e API`);
      }
      
      const data = await response.json();
      apiData = {
        type: 'race',
        name: data.name,
        size: data.size,
        speed: data.speed,
        abilityBonuses: data.ability_bonuses?.map(ab => `${ab.ability_score?.name}: +${ab.bonus}`).join(', ') || '',
        languages: data.languages?.map(l => l.name).join(', ') || '',
        proficiencies: data.starting_proficiencies?.map(p => p.name).join(', ') || '',
        traits: data.traits?.map(t => `${t.name}: Check API for details`).join('\n') || ''
      };
    } catch (error) {
      apiError = error.message;
    } finally {
      apiLoading = false;
    }
  }

  /**
   * Lookup background details from D&D 5e API or custom data
   * @param {string} backgroundName
   */
  async function lookupBackground(backgroundName) {
    if (!backgroundName.trim()) return;
    
    apiLoading = true;
    apiError = '';
    apiData = null;
    showApiPopup = true;
    
    try {
      const result = await enhancedLookup(backgroundName.trim(), 'backgrounds', 'backgrounds');
      
      if (!result) {
        throw new Error(`Background "${backgroundName}" not found in D&D 5e API or custom data`);
      }
      
      const data = result.data;
      const source = result.source;
      
      // Handle both API format and custom format
      let features = [];
      if (source === 'api') {
        // API format
        if (data.feature) {
          features.push({
            name: data.feature.name,
            description: data.feature.desc?.join('\n\n') || 'Feature description available in full API'
          });
        }
      } else {
        // Custom format - features already in the right format
        features = data.features || [];
      }
      
      apiData = {
        type: 'background',
        name: data.name,
        skillProficiencies: source === 'api' 
          ? data.skill_proficiencies?.map(sp => sp.name).join(', ') || ''
          : data.skillProficiencies || '',
        languages: source === 'api'
          ? data.languages?.map(l => l.name || `Choose ${l.choose} languages`).join(', ') || ''
          : data.languages || '',
        equipment: source === 'api'
          ? data.starting_equipment?.map(eq => `${eq.quantity || 1}x ${eq.equipment?.name || 'Equipment'}`).join(', ') || ''
          : data.equipment || '',
        equipmentOptions: source === 'api'
          ? data.starting_equipment_options?.map(opt => `Choose ${opt.choose} from equipment options`).join(', ') || ''
          : data.equipmentOptions || '',
        features: features,
        source: source // Track where the data came from
      };
    } catch (error) {
      apiError = error.message;
    } finally {
      apiLoading = false;
    }
  }

  /**
   * Close API popup
   */
  function closeApiPopup() {
    showApiPopup = false;
    apiData = null;
    apiError = '';
  }

  /**
   * Auto-populate spell fields from API data
   */
  function populateSpellFromApi() {
    if (apiData && apiData.type === 'spell' && typeof apiData.spellIndex === 'number' && apiData.spellIndex >= 0) {
      const spell = character.spells[apiData.spellIndex];
      if (spell) {
        spell.level = apiData.level;
        spell.school = apiData.school;
        spell.description = apiData.description;
        character = character; // Trigger reactivity
      }
    }
    closeApiPopup();
  }

  /**
   * Lookup class features from D&D 5e API
   * @param {string} className
   */
  async function lookupClassFeatures(className) {
    if (!className.trim()) return;
    
    apiLoading = true;
    apiError = '';
    apiData = null;
    showApiPopup = true;
    
    try {
      const formattedName = formatForApi(className.trim());
      const response = await fetch(`https://www.dnd5eapi.co/api/classes/${formattedName}/levels`);
      
      if (!response.ok) {
        throw new Error(`Class features for "${className}" not found in D&D 5e API`);
      }
      
      const data = await response.json();
      const currentLevel = character.level || 1;
      
      // Get features available at current level and below
      const availableFeatures = [];
      for (let level = 1; level <= currentLevel; level++) {
        const levelData = data.find(l => l.level === level);
        if (levelData && levelData.features) {
          for (const feature of levelData.features) {
            availableFeatures.push({
              name: feature.name,
              level: level,
              index: feature.index
            });
          }
        }
      }

      apiData = {
        type: 'class-features',
        className: className,
        currentLevel: currentLevel,
        features: availableFeatures
      };
    } catch (error) {
      apiError = error.message;
    } finally {
      apiLoading = false;
    }
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

  /**
   * Add new class feature
   */
  function addClassFeature() {
    character.class_features.push({ name: '', level: character.level || 1, description: '' });
    character = character; // Trigger reactivity
  }

  /**
   * Remove class feature
   * @param {number} index
   */
  function removeClassFeature(index) {
    character.class_features.splice(index, 1);
    character = character; // Trigger reactivity
  }

  /**
   * Add selected class feature from API
   * @param {Object} feature
   */
  function addFeatureFromApi(feature) {
    const existingFeature = character.class_features.find(cf => cf.name === feature.name);
    if (!existingFeature) {
      character.class_features.push({
        name: feature.name,
        level: feature.level,
        description: `Level ${feature.level} ${character.class || 'Class'} feature`
      });
      character = character; // Trigger reactivity
    }
  }

  /**
   * Add selected background feature from API
   * @param {Object} feature
   */
  function addBackgroundFeatureFromApi(feature) {
    const existingFeature = character.class_features.find(cf => cf.name === feature.name);
    if (!existingFeature) {
      character.class_features.push({
        name: feature.name,
        level: 1, // Background features are available from level 1
        description: feature.description || `${character.background || 'Background'} feature`
      });
      character = character; // Trigger reactivity
    }
  }

  /**
   * Check if a feature is already added to the character
   * @param {string} featureName
   * @returns {boolean}
   */
  function isFeatureAlreadyAdded(featureName) {
    return character.class_features.some(cf => cf.name === featureName);
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
            <div class="input-with-lookup">
              {#if config.type === 'text'}
                <input 
                  id="char-{fieldName}" 
                  type="text" 
                  bind:value={character[fieldName]} 
                  placeholder={config.placeholder || ''}
                />
                {#if fieldName === 'class'}
                  <button 
                    class="lookup-btn" 
                    onclick={() => lookupClass(character[fieldName])}
                    title="Lookup class details"
                    disabled={!character[fieldName]?.trim()}
                  >
                    🔍
                  </button>
                  <button 
                    class="lookup-btn features" 
                    onclick={() => lookupClassFeatures(character[fieldName])}
                    title="Lookup class features"
                    disabled={!character[fieldName]?.trim()}
                  >
                    ⚔️
                  </button>
                {:else if fieldName === 'race'}
                  <button 
                    class="lookup-btn" 
                    onclick={() => lookupRace(character[fieldName])}
                    title="Lookup race details"
                    disabled={!character[fieldName]?.trim()}
                  >
                    🔍
                  </button>
                {:else if fieldName === 'background'}
                  <button 
                    class="lookup-btn" 
                    onclick={() => lookupBackground(character[fieldName])}
                    title="Lookup background details"
                    disabled={!character[fieldName]?.trim()}
                  >
                    🔍
                  </button>
                {/if}
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

  <!-- Class Features Section -->
  <div class="class-features-section">
    <div class="section-header">
      <h4>Class Features</h4>
      <button class="add-btn" onclick={() => addClassFeature()}>+ Add Feature</button>
    </div>
    {#if character.class_features.length === 0}
      <p class="empty-message">No class features added yet.</p>
    {:else}
      <div class="features-list">
        {#each character.class_features as feature, index}
          <div class="feature-row">
            <div class="feature-inputs">
              <input 
                type="text" 
                bind:value={feature.name} 
                placeholder="Feature name"
                class="feature-name"
              >
              <input 
                type="number" 
                bind:value={feature.level} 
                min="1"
                max="20"
                class="feature-level"
                placeholder="Lvl"
              >
              <input 
                type="text" 
                bind:value={feature.description} 
                placeholder="Description"
                class="feature-description"
              >
            </div>
            <button class="remove-btn" onclick={() => removeClassFeature(index)}>×</button>
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
              <div class="input-with-lookup">
                <input 
                  type="text" 
                  bind:value={spell.name} 
                  placeholder="Spell name"
                  class="spell-name"
                >
                <button 
                  class="lookup-btn small" 
                  onclick={() => lookupSpell(spell.name, index)}
                  title="Lookup spell details"
                  disabled={!spell.name?.trim()}
                >
                  🔍
                </button>
              </div>
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

<!-- API Details Popup -->
{#if showApiPopup}
  <div class="api-popup-backdrop" onclick={closeApiPopup} role="button" tabindex="0" onkeydown={(e) => (e.key === 'Escape') && closeApiPopup()}>
    <div class="api-popup" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <div class="api-popup-header">
        <h4>D&D 5e API Details</h4>
        <button class="close-btn" onclick={closeApiPopup}>×</button>
      </div>
      
      <div class="api-popup-content">
        {#if apiLoading}
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading details from D&D 5e API...</p>
          </div>
        {:else if apiError}
          <div class="api-error">
            <p><strong>⚠️ {apiError}</strong></p>
            <p class="error-note">This might be a custom entry not in the official D&D 5e API, which is perfectly fine! Your character sheet will still save this information.</p>
          </div>
        {:else if apiData}
          <div class="api-details">
            {#if apiData.type === 'spell'}
              <div class="spell-details">
                <h3>{apiData.name}</h3>
                <div class="spell-info-grid">
                  <div><strong>Level:</strong> {apiData.level === 0 ? 'Cantrip' : `Level ${apiData.level}`}</div>
                  <div><strong>School:</strong> {apiData.school}</div>
                  <div><strong>Casting Time:</strong> {apiData.castingTime}</div>
                  <div><strong>Range:</strong> {apiData.range}</div>
                  <div><strong>Components:</strong> {apiData.components}</div>
                  <div><strong>Duration:</strong> {apiData.duration}</div>
                  {#if apiData.classes}
                    <div><strong>Classes:</strong> {apiData.classes}</div>
                  {/if}
                </div>
                <div class="description">
                  <strong>Description:</strong>
                  <p>{apiData.description}</p>
                  {#if apiData.higherLevel}
                    <p><strong>At Higher Levels:</strong> {apiData.higherLevel}</p>
                  {/if}
                </div>
                {#if typeof apiData.spellIndex === 'number' && apiData.spellIndex >= 0}
                  <div class="auto-populate-section">
                    <button class="populate-btn" onclick={populateSpellFromApi}>
                      📝 Auto-fill spell fields with this data
                    </button>
                  </div>
                {/if}
              </div>
            {:else if apiData.type === 'class'}
              <div class="class-details">
                <h3>{apiData.name}</h3>
                <div class="class-info">
                  <div><strong>Hit Die:</strong> d{apiData.hitDie}</div>
                  {#if apiData.primaryAbility}
                    <div><strong>Saving Throw Proficiencies:</strong> {apiData.primaryAbility}</div>
                  {/if}
                  {#if apiData.proficiencies}
                    <div><strong>Proficiencies:</strong> {apiData.proficiencies}</div>
                  {/if}
                  {#if apiData.proficiencyChoices}
                    <div><strong>Proficiency Choices:</strong>
                      <pre class="choices">{apiData.proficiencyChoices}</pre>
                    </div>
                  {/if}
                </div>
              </div>
            {:else if apiData.type === 'race'}
              <div class="race-details">
                <h3>{apiData.name}</h3>
                <div class="race-info">
                  <div><strong>Size:</strong> {apiData.size}</div>
                  <div><strong>Speed:</strong> {apiData.speed} feet</div>
                  {#if apiData.abilityBonuses}
                    <div><strong>Ability Score Increases:</strong> {apiData.abilityBonuses}</div>
                  {/if}
                  {#if apiData.languages}
                    <div><strong>Languages:</strong> {apiData.languages}</div>
                  {/if}
                  {#if apiData.proficiencies}
                    <div><strong>Proficiencies:</strong> {apiData.proficiencies}</div>
                  {/if}
                  {#if apiData.traits}
                    <div><strong>Racial Traits:</strong>
                      <pre class="traits">{apiData.traits}</pre>
                    </div>
                  {/if}
                </div>
              </div>
            {:else if apiData.type === 'background'}
              <div class="background-details">
                <h3>{apiData.name} 
                  {#if apiData.source}
                    <span class="data-source {apiData.source}">{apiData.source === 'api' ? '🌐 Official' : '📝 Custom'}</span>
                  {/if}
                </h3>
                <div class="background-info">
                  {#if apiData.skillProficiencies}
                    <div><strong>Skill Proficiencies:</strong> {apiData.skillProficiencies}</div>
                  {/if}
                  {#if apiData.languages}
                    <div><strong>Languages:</strong> {apiData.languages}</div>
                  {/if}
                  {#if apiData.equipment}
                    <div><strong>Starting Equipment:</strong> {apiData.equipment}</div>
                  {/if}
                  {#if apiData.equipmentOptions}
                    <div><strong>Equipment Options:</strong> {apiData.equipmentOptions}</div>
                  {/if}
                </div>
                {#if apiData.features && apiData.features.length > 0}
                  <div class="background-features">
                    <h4>Background Features:</h4>
                    <div class="features-grid">
                      {#each apiData.features as feature}
                        <div class="feature-card">
                          <div class="feature-info">
                            <strong>{feature.name}</strong>
                            <p class="feature-description">{feature.description}</p>
                          </div>
                          <button 
                            class="add-feature-btn {isFeatureAlreadyAdded(feature.name) ? 'added' : ''}" 
                            onclick={() => addBackgroundFeatureFromApi(feature)}
                            disabled={isFeatureAlreadyAdded(feature.name)}
                            title={isFeatureAlreadyAdded(feature.name) ? 'Feature already added' : 'Add this feature to your character'}
                          >
                            {isFeatureAlreadyAdded(feature.name) ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {:else if apiData.type === 'class-features'}
              <div class="class-features-details">
                <h3>{apiData.className} Features (Level {apiData.currentLevel})</h3>
                <div class="features-available">
                  <p><strong>Available class features at your current level:</strong></p>
                  {#if apiData.features.length === 0}
                    <p class="no-features">No features found for this class at level {apiData.currentLevel}.</p>
                  {:else}
                    <div class="features-grid">
                      {#each apiData.features as feature}
                        <div class="feature-card">
                          <div class="feature-info">
                            <strong>{feature.name}</strong>
                            <span class="feature-level-badge">Level {feature.level}</span>
                          </div>
                          <button 
                            class="add-feature-btn {isFeatureAlreadyAdded(feature.name) ? 'added' : ''}" 
                            onclick={() => addFeatureFromApi(feature)}
                            disabled={isFeatureAlreadyAdded(feature.name)}
                            title={isFeatureAlreadyAdded(feature.name) ? 'Feature already added' : 'Add this feature to your character'}
                          >
                            {isFeatureAlreadyAdded(feature.name) ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}
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

  .input-with-lookup {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .input-with-lookup input {
    flex: 1;
  }

  .lookup-btn {
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    min-width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lookup-btn:hover:not(:disabled) {
    background-color: #1976D2;
    transform: translateY(-1px);
  }

  .lookup-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .lookup-btn.small {
    padding: 0.25rem;
    min-width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }

  .lookup-btn.features {
    background-color: #FF5722;
  }

  .lookup-btn.features:hover:not(:disabled) {
    background-color: #E64A19;
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

  /* Items, Spells, Class Features, and Notes Sections */
  .items-section, .spells-section, .class-features-section, .notes-section {
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
  .items-list, .spells-list, .features-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-row, .spell-row, .feature-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .item-inputs, .spell-inputs, .feature-inputs {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    flex-wrap: wrap;
  }

  .item-name, .spell-name, .feature-name {
    flex: 2;
    min-width: 150px;
  }

  .item-quantity, .spell-level, .feature-level {
    width: 60px;
    flex: none;
  }

  .item-description, .spell-description, .feature-description {
    flex: 3;
    min-width: 200px;
  }

  .spell-school {
    flex: 1;
    min-width: 120px;
  }

  .item-inputs input, .spell-inputs input, .feature-inputs input {
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

  /* API Popup */
  .api-popup-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1001;
    padding: 1rem;
    box-sizing: border-box;
  }

  .api-popup {
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 700px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .api-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  }

  .api-popup-header h4 {
    margin: 0;
    color: #333;
    font-size: 1.3rem;
  }

  .api-popup-header .close-btn {
    background: #f44336;
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .api-popup-header .close-btn:hover {
    background: #d32f2f;
    transform: scale(1.1);
  }

  .api-popup-content {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #2196F3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .api-error {
    text-align: center;
    padding: 1rem;
  }

  .api-error p {
    color: #f44336;
    margin-bottom: 1rem;
  }

  .error-note {
    color: #666 !important;
    font-style: italic;
    font-size: 0.9rem;
  }

  .api-details h3 {
    margin: 0 0 1.5rem 0;
    color: #2196F3;
    font-size: 1.5rem;
    text-align: center;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  /* Spell Details */
  .spell-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .spell-info-grid div {
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .description {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .description p {
    margin: 0.5rem 0;
    line-height: 1.6;
    color: #333;
  }

  /* Class Details */
  .class-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .class-info div {
    padding: 0.75rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .choices, .traits {
    background: #f5f5f5;
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid #ddd;
    font-family: inherit;
    font-size: 0.9rem;
    white-space: pre-wrap;
    margin: 0.5rem 0 0 0;
    color: #555;
  }

  /* Race Details */
  .race-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .race-info div {
    padding: 0.75rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  /* Background Details */
  .background-details h3 {
    margin: 0 0 1.5rem 0;
    color: #9C27B0;
    font-size: 1.5rem;
    text-align: center;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .data-source {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .data-source.api {
    background-color: #2196F3;
    color: white;
  }

  .data-source.custom {
    background-color: #FF9800;
    color: white;
  }

  .background-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    margin-bottom: 1.5rem;
  }

  .background-info div {
    padding: 0.75rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .background-features h4 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.2rem;
  }

  .feature-description {
    font-size: 0.9rem;
    color: #666;
    margin: 0.5rem 0 0 0;
    line-height: 1.4;
  }

  /* Auto-populate section */
  .auto-populate-section {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #e0e0e0;
  }

  .populate-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .populate-btn:hover {
    background-color: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  /* Class Features Details */
  .class-features-details h3 {
    margin: 0 0 1.5rem 0;
    color: #FF5722;
    font-size: 1.5rem;
    text-align: center;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .features-available {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .no-features {
    text-align: center;
    color: #666;
    font-style: italic;
    margin: 1rem 0;
  }

  .features-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .feature-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: #FF5722;
    box-shadow: 0 2px 4px rgba(255, 87, 34, 0.2);
  }

  .feature-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .feature-level-badge {
    font-size: 0.8rem;
    color: #666;
    background: #f0f0f0;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    align-self: flex-start;
  }

  .add-feature-btn {
    background-color: #FF5722;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .add-feature-btn:hover {
    background-color: #E64A19;
    transform: translateY(-1px);
  }

  .add-feature-btn.added {
    background-color: #4CAF50;
    cursor: default;
  }

  .add-feature-btn.added:hover {
    background-color: #4CAF50;
    transform: none;
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

    .items-section, .spells-section, .class-features-section, .notes-section {
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

    .item-row, .spell-row, .feature-row {
      background-color: #404040;
      border-color: #666;
    }

    .item-inputs input, .spell-inputs input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .item-inputs input, .spell-inputs input, .feature-inputs input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .notes-textarea {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    /* API Popup Dark Mode */
    .api-popup {
      background-color: #2f2f2f;
      color: #f6f6f6;
    }

    .api-popup-header {
      background: linear-gradient(135deg, #404040, #2f2f2f);
      border-bottom-color: #555;
    }

    .api-popup-header h4 {
      color: #f6f6f6;
    }

    .api-error p:not(.error-note) {
      color: #ff6b6b;
    }

    .error-note {
      color: #ccc !important;
    }

    .api-details h3 {
      color: #64b5f6;
      border-bottom-color: #555;
    }

    .spell-info-grid,
    .class-info,
    .race-info {
      background-color: #404040;
      border-color: #666;
    }

    .spell-info-grid div,
    .class-info div,
    .race-info div {
      background-color: #2f2f2f;
      border-color: #555;
      color: #f6f6f6;
    }

    .description {
      background-color: #404040;
      border-color: #666;
    }

    .description p {
      color: #f6f6f6;
    }

    .choices,
    .traits {
      background-color: #353535;
      border-color: #666;
      color: #ccc;
    }

    .lookup-btn:not(:disabled) {
      background-color: #2196F3;
    }

    .lookup-btn:not(:disabled):hover {
      background-color: #1976D2;
    }

    .lookup-btn:disabled {
      background-color: #555;
    }

    .spinner {
      border-color: #555;
      border-top-color: #64b5f6;
    }

    /* Dark mode for new API elements */
    .auto-populate-section {
      border-top-color: #555;
    }

    .class-features-details h3 {
      color: #ff8a65;
      border-bottom-color: #555;
    }

    .background-details h3 {
      color: #ce93d8;
      border-bottom-color: #555;
    }

    .background-info {
      background-color: #404040;
      border-color: #666;
    }

    .background-info div {
      background-color: #2f2f2f;
      border-color: #555;
      color: #f6f6f6;
    }

    .background-features h4 {
      color: #f6f6f6;
    }

    .feature-description {
      color: #ccc;
    }

    .features-available {
      background-color: #404040;
      border-color: #666;
    }

    .no-features {
      color: #ccc;
    }

    .feature-card {
      background-color: #2f2f2f;
      border-color: #555;
      color: #f6f6f6;
    }

    .feature-card:hover {
      border-color: #ff8a65;
    }

    .feature-level-badge {
      background-color: #555;
      color: #ccc;
    }

    .lookup-btn.features {
      background-color: #FF5722;
    }

    .lookup-btn.features:hover:not(:disabled) {
      background-color: #E64A19;
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
