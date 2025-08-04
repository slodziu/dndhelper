<script>
  import { onMount } from 'svelte';
  import { enhancedLookup, scanCustomFiles } from './customDataManager.js';

  // Monster data
  /** @type {any[]} */
  let monsters = $state([]);
  let expandedMonsters = $state(new Set());
  let searchTerm = $state('');
  let isLoading = $state(false);
  let error = $state('');

  // Add monster form
  let showAddForm = $state(false);
  let newMonsterName = $state('');
  let addingFromAPI = $state(false);

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
   * Toggle monster expansion
   * @param {string} monsterId
   */
  function toggleMonster(monsterId) {
    if (expandedMonsters.has(monsterId)) {
      expandedMonsters.delete(monsterId);
    } else {
      expandedMonsters.add(monsterId);
    }
    expandedMonsters = new Set(expandedMonsters); // Trigger reactivity
  }

  /**
   * Load custom monsters from data files
   */
  async function loadCustomMonsters() {
    try {
      const customMonsters = await scanCustomFiles('monsters');
      const loadedMonsters = [];

      for (const monsterInfo of customMonsters) {
        try {
          const response = await fetch(`/data/monsters/${monsterInfo.filename}`);
          if (response.ok) {
            const monsterData = await response.json();
            loadedMonsters.push({
              ...monsterData,
              id: monsterInfo.filename.replace('.json', ''),
              source: 'custom'
            });
          }
        } catch (error) {
          console.warn(`Failed to load monster: ${monsterInfo.filename}`);
        }
      }

      monsters = [...loadedMonsters];
    } catch (error) {
      console.error('Error loading custom monsters:', error);
    }
  }

  /**
   * Add monster from API
   * @param {string} monsterName
   */
  async function addMonsterFromAPI(monsterName) {
    if (!monsterName.trim()) return;

    addingFromAPI = true;
    error = '';

    try {
      const result = await enhancedLookup(monsterName.trim(), 'monsters', 'monsters');
      
      if (!result) {
        throw new Error(`Monster "${monsterName}" not found in D&D 5e API or custom data`);
      }

      const monsterData = result.data;
      const formattedMonster = {
        id: monsterData.index || monsterData.name.toLowerCase().replace(/\s+/g, '-'),
        name: monsterData.name,
        size: monsterData.size,
        type: monsterData.type,
        subtype: monsterData.subtype || '',
        alignment: monsterData.alignment,
        armor_class: monsterData.armor_class,
        armor_desc: monsterData.armor_class ? `${monsterData.armor_class}` : '',
        hit_points: monsterData.hit_points,
        hit_dice: monsterData.hit_dice,
        speed: monsterData.speed || { walk: 30 },
        strength: monsterData.strength,
        dexterity: monsterData.dexterity,
        constitution: monsterData.constitution,
        intelligence: monsterData.intelligence,
        wisdom: monsterData.wisdom,
        charisma: monsterData.charisma,
        skills: monsterData.skills || {},
        senses: Array.isArray(monsterData.senses) ? monsterData.senses.join(', ') : (monsterData.senses || 'passive Perception 10'),
        languages: monsterData.languages || 'None',
        challenge_rating: monsterData.challenge_rating,
        experience_points: monsterData.xp || 0,
        special_abilities: monsterData.special_abilities || [],
        actions: monsterData.actions || [],
        legendary_actions: monsterData.legendary_actions || [],
        source: result.source
      };

      // Check if monster already exists
      const existingIndex = monsters.findIndex(m => m.id === formattedMonster.id);
      if (existingIndex >= 0) {
        monsters[existingIndex] = formattedMonster;
      } else {
        monsters = [...monsters, formattedMonster];
      }

      newMonsterName = '';
      showAddForm = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    } finally {
      addingFromAPI = false;
    }
  }

  /**
   * Filtered monsters based on search
   */
  function getFilteredMonsters() {
    if (!searchTerm.trim()) {
      return monsters;
    }
    
    const search = searchTerm.toLowerCase();
    return monsters.filter(monster => 
      monster.name.toLowerCase().includes(search) ||
      monster.type.toLowerCase().includes(search) ||
      monster.challenge_rating.toString().includes(search)
    );
  }

  /**
   * Format speed object for display
   * @param {any} speed
   * @returns {string}
   */
  function formatSpeed(speed) {
    if (!speed) return '30 ft.';
    
    const parts = [];
    if (speed.walk) parts.push(`${speed.walk} ft.`);
    if (speed.fly) parts.push(`fly ${speed.fly} ft.`);
    if (speed.swim) parts.push(`swim ${speed.swim} ft.`);
    if (speed.climb) parts.push(`climb ${speed.climb} ft.`);
    if (speed.burrow) parts.push(`burrow ${speed.burrow} ft.`);
    
    return parts.join(', ') || '30 ft.';
  }

  /**
   * Format skills object for display
   * @param {any} skills
   * @returns {string}
   */
  function formatSkills(skills) {
    if (!skills || Object.keys(skills).length === 0) return 'None';
    
    return Object.entries(skills)
      .map(([skill, modifier]) => `${skill} ${modifier}`)
      .join(', ');
  }

  // Load monsters when component mounts
  onMount(() => {
    loadCustomMonsters();
  });
</script>

<div class="monster-manual">
  <div class="monster-manual-header">
    <h3>🐉 Monster Manual</h3>
    <div class="controls">
      <div class="search-box">
        <input 
          type="text" 
          bind:value={searchTerm} 
          placeholder="Search monsters by name, type, or CR..."
          class="search-input"
        />
      </div>
      <button 
        class="add-btn" 
        onclick={() => showAddForm = !showAddForm}
      >
        {showAddForm ? '✕ Cancel' : '+ Add Monster'}
      </button>
    </div>
  </div>

  {#if showAddForm}
    <div class="add-monster-form">
      <h4>Add Monster</h4>
      <div class="form-controls">
        <input 
          type="text" 
          bind:value={newMonsterName} 
          placeholder="Enter monster name (from D&D 5e API or custom data)"
          class="monster-name-input"
          onkeydown={(e) => e.key === 'Enter' && addMonsterFromAPI(newMonsterName)}
        />
        <button 
          class="lookup-btn" 
          onclick={() => addMonsterFromAPI(newMonsterName)}
          disabled={addingFromAPI || !newMonsterName.trim()}
        >
          {addingFromAPI ? '🔍 Looking up...' : '🔍 Add Monster'}
        </button>
      </div>
      {#if error}
        <div class="error-message">
          ⚠️ {error}
        </div>
      {/if}
    </div>
  {/if}

  <div class="monster-count">
    {getFilteredMonsters().length} monster(s) {searchTerm ? `matching "${searchTerm}"` : 'total'}
  </div>

  <div class="monster-list">
    {#each getFilteredMonsters() as monster (monster.id)}
      <div class="monster-card">
        <div 
          class="monster-header" 
          onclick={() => toggleMonster(monster.id)}
          role="button"
          tabindex="0"
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleMonster(monster.id)}
        >
          <div class="monster-title">
            <h4>{monster.name}</h4>
            <span class="monster-subtitle">
              {monster.size} {monster.type}{monster.subtype ? ` (${monster.subtype})` : ''}, {monster.alignment}
            </span>
            <div class="monster-basics">
              <span class="cr">CR {monster.challenge_rating}</span>
              <span class="ac">AC {monster.armor_class}</span>
              <span class="hp">{monster.hit_points} HP</span>
              <span class="source-badge {monster.source}">
                {monster.source === 'api' ? '🌐 Official' : '📝 Custom'}
              </span>
            </div>
          </div>
          <div class="expand-indicator">
            {expandedMonsters.has(monster.id) ? '▼' : '▶'}
          </div>
        </div>

        {#if expandedMonsters.has(monster.id)}
          <div class="monster-details">
            <!-- Basic Stats -->
            <div class="stat-line">
              <strong>Armor Class</strong> {monster.armor_class}{monster.armor_desc ? ` (${monster.armor_desc})` : ''}
            </div>
            <div class="stat-line">
              <strong>Hit Points</strong> {monster.hit_points}{monster.hit_dice ? ` (${monster.hit_dice})` : ''}
            </div>
            <div class="stat-line">
              <strong>Speed</strong> {formatSpeed(monster.speed)}
            </div>

            <!-- Ability Scores -->
            <div class="ability-scores">
              <div class="ability-grid">
                <div class="ability">
                  <div class="ability-name">STR</div>
                  <div class="ability-score">{monster.strength} ({formatModifier(getModifier(monster.strength))})</div>
                </div>
                <div class="ability">
                  <div class="ability-name">DEX</div>
                  <div class="ability-score">{monster.dexterity} ({formatModifier(getModifier(monster.dexterity))})</div>
                </div>
                <div class="ability">
                  <div class="ability-name">CON</div>
                  <div class="ability-score">{monster.constitution} ({formatModifier(getModifier(monster.constitution))})</div>
                </div>
                <div class="ability">
                  <div class="ability-name">INT</div>
                  <div class="ability-score">{monster.intelligence} ({formatModifier(getModifier(monster.intelligence))})</div>
                </div>
                <div class="ability">
                  <div class="ability-name">WIS</div>
                  <div class="ability-score">{monster.wisdom} ({formatModifier(getModifier(monster.wisdom))})</div>
                </div>
                <div class="ability">
                  <div class="ability-name">CHA</div>
                  <div class="ability-score">{monster.charisma} ({formatModifier(getModifier(monster.charisma))})</div>
                </div>
              </div>
            </div>

            <!-- Skills, Senses, Languages -->
            {#if monster.skills && Object.keys(monster.skills).length > 0}
              <div class="stat-line">
                <strong>Skills</strong> {formatSkills(monster.skills)}
              </div>
            {/if}
            <div class="stat-line">
              <strong>Senses</strong> {monster.senses}
            </div>
            <div class="stat-line">
              <strong>Languages</strong> {monster.languages}
            </div>
            <div class="stat-line">
              <strong>Challenge</strong> {monster.challenge_rating} ({monster.experience_points} XP)
            </div>

            <!-- Special Abilities -->
            {#if monster.special_abilities && monster.special_abilities.length > 0}
              <div class="special-abilities">
                <h5>Special Abilities</h5>
                {#each monster.special_abilities as ability}
                  <div class="ability-block">
                    <strong>{ability.name}.</strong> {ability.desc}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Actions -->
            {#if monster.actions && monster.actions.length > 0}
              <div class="actions">
                <h5>Actions</h5>
                {#each monster.actions as action}
                  <div class="action-block">
                    <strong>{action.name}.</strong> {action.desc}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Legendary Actions -->
            {#if monster.legendary_actions && monster.legendary_actions.length > 0}
              <div class="legendary-actions">
                <h5>Legendary Actions</h5>
                {#each monster.legendary_actions as action}
                  <div class="action-block">
                    <strong>{action.name}.</strong> {action.desc}
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Notes -->
            {#if monster.notes}
              <div class="notes">
                <h5>Notes</h5>
                <div class="notes-content">{monster.notes}</div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}

    {#if getFilteredMonsters().length === 0}
      <div class="empty-state">
        {#if searchTerm}
          <p>No monsters found matching "{searchTerm}"</p>
          <p class="hint">Try a different search term or add a new monster.</p>
        {:else}
          <p>No monsters added yet</p>
          <p class="hint">Add monsters from the D&D 5e API or create custom JSON files in /static/data/monsters/</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .monster-manual {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  .monster-manual-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .monster-manual-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.8rem;
  }

  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
  }

  .search-input {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    width: 300px;
    max-width: 100%;
  }

  .search-input:focus {
    outline: none;
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
  }

  .add-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .add-btn:hover {
    background-color: #45a049;
  }

  .add-monster-form {
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .add-monster-form h4 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .form-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .monster-name-input {
    flex: 1;
    min-width: 250px;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .lookup-btn {
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .lookup-btn:hover:not(:disabled) {
    background-color: #1976D2;
  }

  .lookup-btn:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .error-message {
    color: #f44336;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #ffebee;
    border-radius: 4px;
    border: 1px solid #ffcdd2;
  }

  .monster-count {
    color: #666;
    margin-bottom: 1rem;
    font-style: italic;
  }

  .monster-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .monster-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    transition: all 0.2s ease;
  }

  .monster-card:hover {
    border-color: #2196F3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
  }

  .monster-header {
    padding: 1rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.2s ease;
  }

  .monster-header:hover {
    background: #e9ecef;
  }

  .monster-title {
    flex: 1;
  }

  .monster-title h4 {
    margin: 0 0 0.25rem 0;
    color: #333;
    font-size: 1.3rem;
  }

  .monster-subtitle {
    color: #666;
    font-style: italic;
    display: block;
    margin-bottom: 0.5rem;
  }

  .monster-basics {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .monster-basics span {
    background: #e0e0e0;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .cr {
    background-color: #f44336 !important;
    color: white;
  }

  .ac {
    background-color: #2196F3 !important;
    color: white;
  }

  .hp {
    background-color: #4CAF50 !important;
    color: white;
  }

  .source-badge {
    font-size: 0.7rem !important;
    padding: 0.25rem 0.5rem !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
  }

  .source-badge.api {
    background-color: #2196F3 !important;
    color: white !important;
  }

  .source-badge.custom {
    background-color: #FF9800 !important;
    color: white !important;
  }

  .expand-indicator {
    font-size: 1.2rem;
    color: #666;
    transition: transform 0.2s ease;
  }

  .monster-details {
    padding: 1.5rem;
    border-top: 1px solid #e0e0e0;
  }

  .stat-line {
    margin-bottom: 0.5rem;
    color: #333;
  }

  .stat-line strong {
    color: #2196F3;
  }

  .ability-scores {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .ability-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1rem;
    text-align: center;
  }

  .ability {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ability-name {
    font-weight: bold;
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .ability-score {
    font-weight: bold;
    color: #333;
  }

  .special-abilities,
  .actions,
  .legendary-actions,
  .notes {
    margin-top: 1.5rem;
  }

  .special-abilities h5,
  .actions h5,
  .legendary-actions h5,
  .notes h5 {
    margin: 0 0 0.75rem 0;
    color: #2196F3;
    font-size: 1.1rem;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 0.25rem;
  }

  .ability-block,
  .action-block {
    margin-bottom: 0.75rem;
    line-height: 1.5;
    color: #333;
  }

  .notes-content {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 0.75rem;
    color: #856404;
    font-style: italic;
    line-height: 1.5;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  .hint {
    font-size: 0.9rem;
    color: #999;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .monster-manual-header {
      flex-direction: column;
      align-items: stretch;
    }

    .controls {
      flex-direction: column;
    }

    .search-input {
      width: 100%;
    }

    .ability-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .monster-basics {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .form-controls {
      flex-direction: column;
    }

    .monster-name-input {
      min-width: 100%;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .monster-manual-header h3 {
      color: #f6f6f6;
    }

    .search-input,
    .monster-name-input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }

    .add-monster-form {
      background-color: #2f2f2f;
      border-color: #555;
    }

    .add-monster-form h4 {
      color: #f6f6f6;
    }

    .monster-count {
      color: #ccc;
    }

    .monster-card {
      background-color: #2f2f2f;
      border-color: #555;
    }

    .monster-header {
      background-color: #404040;
      border-bottom-color: #666;
    }

    .monster-header:hover {
      background-color: #4a4a4a;
    }

    .monster-title h4,
    .stat-line,
    .ability-block,
    .action-block {
      color: #f6f6f6;
    }

    .monster-subtitle {
      color: #ccc;
    }

    .ability-scores {
      background-color: #404040;
      border-color: #666;
    }

    .ability-name {
      color: #ccc;
    }

    .ability-score {
      color: #f6f6f6;
    }

    .special-abilities h5,
    .actions h5,
    .legendary-actions h5,
    .notes h5 {
      color: #64B5F6;
      border-bottom-color: #666;
    }

    .stat-line strong {
      color: #64B5F6;
    }

    .notes-content {
      background-color: #4a4a00;
      border-color: #666600;
      color: #ffff99;
    }

    .expand-indicator {
      color: #ccc;
    }

    .empty-state {
      color: #ccc;
    }

    .hint {
      color: #999;
    }
  }
</style>
