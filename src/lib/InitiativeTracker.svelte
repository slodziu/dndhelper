<script>
    // @ts-nocheck
    import { onMount } from 'svelte';
    import { loadCharacters, saveCharacter } from './characterStorage.js';
    
    let name = $state('');
    let initiative = $state('');
    
    /** @type {Array<{name: string, initiative: number, isActive: boolean, type?: string, data?: any}>} */
    let entries = $state([]);
    let currentTurnIndex = $state(0);
    let isPlaying = $state(false);
    let showMiniDiceRoller = $state(false);
    let diceInput = $state('');
    let lastRoll = $state('');
    
    // Character and monster lookup
    let showLookupModal = $state(false);
    let savedCharacters = $state([]);
    let monsters = $state([]);
    let selectedEntity = $state(null);
    let showEntityModal = $state(false);
    let selectedSpell = $state(null);
    let showSpellModal = $state(false);
    let saveStatus = $state({ show: false, message: '', type: 'success' });

    function addEntry() {
        const trimmedName = name.trim();
        const initiativeValue = Number(initiative);
        
        console.log('Adding entry:', { trimmedName, initiative, initiativeValue, isNaN: isNaN(initiativeValue) });
        
        if (trimmedName && !isNaN(initiativeValue) && initiativeValue >= 0) {
            const newEntry = { 
                name: trimmedName, 
                initiative: initiativeValue, 
                isActive: false, 
                type: 'manual',
                currentHP: 0,
                maxHP: 0
            };
            entries = [...entries, newEntry].sort((a, b) => b.initiative - a.initiative);
            console.log('Entries after add:', entries);
            name = '';
            initiative = '';
            // Reset turn tracking when new entries are added
            currentTurnIndex = 0;
            updateActiveStates();
        } else {
            console.log('Validation failed');
            alert('Please enter a valid name and initiative value (number >= 0)');
        }
    }

    /**
     * Load characters and monsters for lookup
     */
    async function loadEntitiesForLookup() {
        try {
            // Load saved characters
            savedCharacters = await loadCharacters();
            
            // Load monsters from static data
            const monstersResponse = await fetch('/data/index.json');
            const data = await monstersResponse.json();
            const monsterIndex = data.monsters || [];
            
            // Load full monster data for each monster
            monsters = [];
            for (const monsterInfo of monsterIndex) {
                try {
                    const monsterResponse = await fetch(`/data/monsters/${monsterInfo.filename}`);
                    const monsterData = await monsterResponse.json();
                    // Add the description from index if not present in monster data
                    if (!monsterData.description && monsterInfo.description) {
                        monsterData.description = monsterInfo.description;
                    }
                    // Preserve the creature type under a different name to avoid conflicts
                    if (monsterData.type) {
                        monsterData.creature_type = monsterData.type;
                    }
                    monsters.push(monsterData);
                } catch (monsterError) {
                    console.error(`Failed to load monster ${monsterInfo.name}:`, monsterError);
                    // Fallback to basic info if full data fails to load
                    monsters.push(monsterInfo);
                }
            }
        } catch (error) {
            console.error('Error loading entities:', error);
        }
    }

    /**
     * Add entity (character or monster) to initiative tracker
     */
    function addEntityToInitiative(entity, entityType, customInitiative = null) {
        // Use initiative field value if provided, otherwise use custom or random
        let initiativeValue;
        if (initiative && !isNaN(Number(initiative))) {
            initiativeValue = Number(initiative);
            initiative = ''; // Clear the field after use
        } else if (customInitiative !== null) {
            initiativeValue = customInitiative;
        } else {
            initiativeValue = Math.floor(Math.random() * 20) + 1;
        }
        
        // Get HP data based on entity type
        let currentHP, maxHP;
        if (entityType === 'character') {
            // For characters, get current and max HP from character data
            if (entity.data && entity.data.hitPoints) {
                currentHP = entity.data.hitPoints.current || entity.data.hitPoints.maximum || 0;
                maxHP = entity.data.hitPoints.maximum || 0;
            } else if (entity.hitPoints) {
                currentHP = entity.hitPoints.current || entity.hitPoints.maximum || 0;
                maxHP = entity.hitPoints.maximum || 0;
            } else {
                // Initialize HP for characters without HP data
                currentHP = 0;
                maxHP = 0;
                // Ensure the character data has hitPoints structure
                if (entity.data) {
                    entity.data.hitPoints = { current: currentHP, maximum: maxHP };
                } else {
                    entity.hitPoints = { current: currentHP, maximum: maxHP };
                }
            }
        } else if (entityType === 'monster') {
            // For monsters, use hit_points as both current and max
            currentHP = entity.hit_points || 0;
            maxHP = entity.hit_points || 0;
        } else {
            // Manual entries default to 0
            currentHP = 0;
            maxHP = 0;
        }
        
        const newEntry = {
            name: entity.name,
            initiative: initiativeValue,
            isActive: false,
            type: entityType,
            data: entity,
            currentHP: currentHP,
            maxHP: maxHP
        };
        
        entries = [...entries, newEntry].sort((a, b) => b.initiative - a.initiative);
        currentTurnIndex = 0;
        updateActiveStates();
        showLookupModal = false;
    }

    /**
     * Show entity details when clicked
     */
    function showEntityDetails(entry) {
        if (entry.data) {
            // Entry from lookup with full data
            // Extract the character data from the nested structure
            if (entry.data.data) {
                // Character from storage - data is nested in entry.data.data
                selectedEntity = { ...entry.data.data, type: entry.type };
            } else {
                // Direct data (monster, etc.)
                selectedEntity = { ...entry.data, type: entry.type };
            }
            showEntityModal = true;
        } else {
            // Manually added entry - create a basic entity object
            selectedEntity = {
                name: entry.name,
                type: 'manual',
                initiative: entry.initiative
            };
            showEntityModal = true;
        }
    }

    /**
     * Show spell details in modal
     */
    function showSpellDetails(spell) {
        selectedSpell = spell;
        showSpellModal = true;
    }

    /**
     * Open the lookup modal
     */
    function openLookupModal() {
        loadEntitiesForLookup();
        showLookupModal = true;
    }

    /**
     * Save initiative data to localStorage
     */
    function saveInitiativeData() {
        if (typeof localStorage !== 'undefined') {
            const data = {
                entries,
                currentTurnIndex,
                isPlaying,
                name,
                initiative
            };
            localStorage.setItem('dnd-helper-initiative', JSON.stringify(data));
        }
    }

    /**
     * Load initiative data from localStorage
     */
    function loadInitiativeData() {
        if (typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem('dnd-helper-initiative');
                if (saved) {
                    const data = JSON.parse(saved);
                    entries = data.entries || [];
                    currentTurnIndex = data.currentTurnIndex || 0;
                    isPlaying = data.isPlaying || false;
                    name = data.name || '';
                    initiative = data.initiative || '';
                    updateActiveStates();
                }
            } catch (error) {
                console.error('Failed to load initiative data:', error);
            }
        }
    }

    // Load data when component mounts
    onMount(() => {
        loadInitiativeData();
    });

    // Save data whenever entries change
    $effect(() => {
        saveInitiativeData();
    });

    /**
     * Handle keydown events
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
        if (e.key === 'Enter') addEntry();
    }

    /**
     * Remove an entry from the list
     * @param {number} index
     */
    function removeEntry(index) {
        entries = entries.filter((_, i) => i !== index);
        // Adjust current turn index if needed
        if (currentTurnIndex >= entries.length) {
            currentTurnIndex = 0;
        }
        updateActiveStates();
    }

    /**
     * Clear all entries
     */
    function clearAll() {
        if (entries.length > 0 && confirm('Are you sure you want to clear all entries?')) {
            entries = [];
            currentTurnIndex = 0;
            isPlaying = false;
        }
    }

    /**
     * Update active states for all entries
     */
    function updateActiveStates() {
        entries = entries.map((entry, index) => ({
            ...entry,
            isActive: index === currentTurnIndex
        }));
    }

    /**
     * Start/continue initiative tracking
     */
    function playInitiative() {
        if (entries.length === 0) return;
        
        isPlaying = true;
        updateActiveStates();
    }

    /**
     * Move to next turn
     */
    function nextTurn() {
        if (entries.length === 0) return;
        
        currentTurnIndex = (currentTurnIndex + 1) % entries.length;
        updateActiveStates();
    }

    /**
     * Reset initiative to beginning
     */
    function resetInitiative() {
        currentTurnIndex = 0;
        isPlaying = false;
        updateActiveStates();
    }

    /**
     * Get character initials for display
     * @param {string} name
     * @returns {string}
     */
    function getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    /**
     * Toggle mini dice roller
     */
    function toggleMiniDiceRoller() {
        showMiniDiceRoller = !showMiniDiceRoller;
        if (!showMiniDiceRoller) {
            diceInput = '';
            lastRoll = '';
        }
    }

    /**
     * Roll dice from input string
     */
    function rollMiniDice() {
        if (!diceInput.trim()) return;
        
        try {
            const result = parseDiceExpression(diceInput.trim());
            lastRoll = `${diceInput}: ${result.total} ${result.breakdown ? `(${result.breakdown})` : ''}`;
        } catch (error) {
            lastRoll = `Error: ${error.message}`;
        }
    }

    /**
     * Parse dice expression like "1d20+5" or "2d6+1d4+3"
     */
    function parseDiceExpression(expression) {
        // Remove all spaces
        expression = expression.replace(/\s/g, '');
        
        // Split by + and - while keeping the operators
        const parts = expression.split(/([+-])/).filter(part => part !== '');
        
        let total = 0;
        let breakdown = [];
        let currentSign = 1;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part === '+') {
                currentSign = 1;
            } else if (part === '-') {
                currentSign = -1;
            } else {
                const value = parseDicePart(part);
                total += currentSign * value.total;
                if (value.breakdown) {
                    breakdown.push(`${currentSign === -1 ? '-' : ''}${value.breakdown}=${currentSign * value.total}`);
                } else {
                    breakdown.push(`${currentSign === -1 ? '-' : ''}${currentSign * value.total}`);
                }
            }
        }
        
        return {
            total,
            breakdown: breakdown.join(' ')
        };
    }

    /**
     * Parse a single dice part like "2d6" or "5"
     */
    function parseDicePart(part) {
        if (part.includes('d')) {
            const [numDiceStr, sidesStr] = part.split('d');
            const numDice = parseInt(numDiceStr) || 1;
            const sides = parseInt(sidesStr);
            
            if (numDice < 1 || numDice > 100) throw new Error('Number of dice must be between 1 and 100');
            if (sides < 2 || sides > 1000) throw new Error('Die sides must be between 2 and 1000');
            
            const rolls = [];
            for (let i = 0; i < numDice; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            return {
                total: rolls.reduce((sum, roll) => sum + roll, 0),
                breakdown: `${numDice}d${sides}[${rolls.join(',')}]`
            };
        } else {
            const modifier = parseInt(part);
            if (isNaN(modifier)) throw new Error(`Invalid modifier: ${part}`);
            return { total: modifier };
        }
    }

    /**
     * Handle keydown for mini dice roller
     */
    function handleDiceKeydown(e) {
        if (e.key === 'Enter') rollMiniDice();
    }

    /**
     * Update HP for an entry
     */
    function updateHP(index, newCurrentHP, newMaxHP = null) {
        if (index < 0 || index >= entries.length) return;
        
        const entry = entries[index];
        const oldCurrentHP = entry.currentHP;
        const oldMaxHP = entry.maxHP;
        
        entry.currentHP = Math.max(0, newCurrentHP);
        if (newMaxHP !== null) {
            entry.maxHP = Math.max(0, newMaxHP);
            // Ensure current HP doesn't exceed max HP
            entry.currentHP = Math.min(entry.currentHP, entry.maxHP);
        }
        
        // Update character sheet data if this is a character
        if (entry.type === 'character' && entry.data) {
            updateCharacterHP(entry, oldCurrentHP, oldMaxHP);
        }
        
        // Trigger reactivity
        entries = [...entries];
    }

    /**
     * Update character HP in the actual character data and save to storage
     */
    async function updateCharacterHP(entry, oldCurrentHP, oldMaxHP) {
        try {
            let characterData;
            
            // Handle nested character data structure
            if (entry.data.data) {
                // Character from storage - data is nested in entry.data.data
                characterData = entry.data.data;
            } else {
                // Direct character data
                characterData = entry.data;
            }
            
            // Ensure hitPoints object exists
            if (!characterData.hitPoints) {
                characterData.hitPoints = { current: 0, maximum: 0 };
            }
            
            // Update the character's HP data
            characterData.hitPoints.current = entry.currentHP;
            characterData.hitPoints.maximum = entry.maxHP;
            
            // Save the updated character back to storage
            await saveCharacter(characterData);
            
            console.log(`Updated HP for ${entry.name}: ${entry.currentHP}/${entry.maxHP}`);
            
            // Show success feedback
            showSaveStatus(`${entry.name} HP saved`, 'success');
            
        } catch (error) {
            console.error(`Failed to update character HP for ${entry.name}:`, error);
            // Show error feedback
            showSaveStatus(`Failed to save ${entry.name} HP`, 'error');
        }
    }

    /**
     * Refresh character HP from storage for all character entries
     */
    async function refreshCharacterHP() {
        try {
            const characters = await loadCharacters();
            let updated = false;
            
            entries = entries.map(entry => {
                if (entry.type === 'character' && entry.data) {
                    // Find the matching character in storage
                    const characterName = entry.data.name || (entry.data.data && entry.data.data.name);
                    const updatedChar = characters.find(char => char.name === characterName);
                    
                    if (updatedChar && updatedChar.hitPoints) {
                        const newCurrentHP = updatedChar.hitPoints.current || 0;
                        const newMaxHP = updatedChar.hitPoints.maximum || 0;
                        
                        if (entry.currentHP !== newCurrentHP || entry.maxHP !== newMaxHP) {
                            entry.currentHP = newCurrentHP;
                            entry.maxHP = newMaxHP;
                            
                            // Update the data reference too
                            if (entry.data.data) {
                                entry.data.data.hitPoints = updatedChar.hitPoints;
                            } else {
                                entry.data.hitPoints = updatedChar.hitPoints;
                            }
                            
                            updated = true;
                        }
                    }
                }
                return entry;
            });
            
            if (updated) {
                showSaveStatus('Character HP refreshed', 'success');
            }
            
        } catch (error) {
            console.error('Failed to refresh character HP:', error);
            showSaveStatus('Failed to refresh HP', 'error');
        }
    }

    /**
     * Show save status feedback
     */
    function showSaveStatus(message, type = 'success') {
        saveStatus = { show: true, message, type };
        setTimeout(() => {
            saveStatus = { show: false, message: '', type: 'success' };
        }, 3000);
    }

    /**
     * Adjust HP by a delta amount
     */
    function adjustHP(index, delta) {
        if (index < 0 || index >= entries.length) return;
        
        const newHP = entries[index].currentHP + delta;
        updateHP(index, newHP);
    }

    /**
     * Handle HP input change
     */
    function handleHPInput(index, event, isMaxHP = false) {
        const value = parseInt(event.target.value) || 0;
        if (isMaxHP) {
            updateHP(index, entries[index].currentHP, value);
        } else {
            updateHP(index, value);
        }
    }
</script>

<div class="initiative-tracker">
    <div class="tracker-header">
        <h3>Initiative Tracker</h3>
        <div class="header-actions">
            {#if saveStatus.show}
                <div class="save-status {saveStatus.type}">
                    {saveStatus.message}
                </div>
            {/if}
            <button onclick={toggleMiniDiceRoller} class="dice-btn" title="Quick Dice Roller">
                🎲
            </button>
        </div>
    </div>

    <!-- Mini Dice Roller -->
    {#if showMiniDiceRoller}
        <div class="mini-dice-roller">
            <div class="dice-input-row">
                <input
                    type="text"
                    placeholder="e.g., 1d20+5, 2d6+3"
                    bind:value={diceInput}
                    onkeydown={handleDiceKeydown}
                    class="dice-input"
                />
                <button onclick={rollMiniDice} class="roll-btn">Roll</button>
                <button onclick={toggleMiniDiceRoller} class="close-btn">×</button>
            </div>
            {#if lastRoll}
                <div class="dice-result">
                    {lastRoll}
                </div>
            {/if}
        </div>
    {/if}
    
    <div class="initiative-input">
        <input
            type="text"
            placeholder="Character/Monster Name"
            bind:value={name}
            onkeydown={handleKeydown}
        />
        <input
            type="number"
            placeholder="Initiative"
            bind:value={initiative}
            onkeydown={handleKeydown}
            step="1"
        />
        <button onclick={addEntry}>Add</button>
        <button onclick={openLookupModal} class="lookup-btn" title="Add from saved characters or monsters">📚 Lookup</button>
        {#if entries.some(entry => entry.type === 'character')}
            <button onclick={refreshCharacterHP} class="refresh-btn" title="Refresh character HP from saved data">🔄 Sync HP</button>
        {/if}
        {#if entries.length > 0}
            <button onclick={clearAll} class="clear-btn">Clear All</button>
        {/if}
    </div>

    <!-- Initiative Track -->
    {#if entries.length > 0}
        <div class="initiative-track">
            <div class="track-controls">
                <h4>Combat Turn Order</h4>
                <div class="track-buttons">
                    {#if !isPlaying}
                        <button onclick={playInitiative} class="play-btn">▶ Start Combat</button>
                    {:else}
                        <button onclick={nextTurn} class="next-btn">Next Turn</button>
                        <button onclick={resetInitiative} class="reset-btn">Reset</button>
                    {/if}
                </div>
            </div>

            <div class="character-track">
                {#each entries as entry, index}
                    <div class="character-container">
                        <div 
                            class="character-circle {entry.isActive ? 'active' : ''} {entry.type || 'manual'}" 
                            title="{entry.name} (Initiative: {entry.initiative}) - Click for details"
                            onclick={() => showEntityDetails(entry)}
                            onkeydown={(e) => e.key === 'Enter' && showEntityDetails(entry)}
                            role="button"
                            tabindex="0"
                        >
                            <span class="initials">{getInitials(entry.name)}</span>
                            <div class="initiative-badge">{entry.initiative}</div>
                            {#if entry.type === 'character'}
                                <div class="type-indicator">👤</div>
                            {:else if entry.type === 'monster'}
                                <div class="type-indicator">👹</div>
                            {/if}
                        </div>
                        <div class="character-hp">
                            <span class="hp-text">{entry.currentHP}/{entry.maxHP}</span>
                            <div class="hp-bar">
                                <div 
                                    class="hp-fill" 
                                    style="width: {entry.maxHP > 0 ? (entry.currentHP / entry.maxHP) * 100 : 0}%"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            {#if isPlaying && entries[currentTurnIndex]}
                <div class="current-turn">
                    <strong>🎯 {entries[currentTurnIndex].name}'s Turn</strong>
                </div>
            {/if}
        </div>
    {/if}

    {#if entries.length === 0}
        <p class="empty-message">No initiative entries yet. Add characters/monsters above.</p>
    {:else}
        <div class="initiative-list">
            <h4>Initiative Order:</h4>
            <ul>
                {#each entries as entry, index}
                    <li class="initiative-entry">
                        <span class="entry-info">
                            <strong>{entry.name}</strong>
                            <span class="initiative-value">{entry.initiative}</span>
                        </span>
                        <div class="hp-controls">
                            <div class="hp-display">
                                <div class="hp-inputs">
                                    <input 
                                        type="number" 
                                        class="hp-input current-hp"
                                        value={entry.currentHP}
                                        min="0"
                                        max={entry.maxHP || 999}
                                        oninput={(e) => handleHPInput(index, e)}
                                        title="Current HP"
                                    />
                                    <span class="hp-separator">/</span>
                                    <input 
                                        type="number" 
                                        class="hp-input max-hp"
                                        value={entry.maxHP}
                                        min="0"
                                        oninput={(e) => handleHPInput(index, e, true)}
                                        title="Max HP"
                                    />
                                </div>
                                <div class="hp-buttons">
                                    <button 
                                        class="hp-btn damage-btn" 
                                        onclick={() => adjustHP(index, -1)}
                                        title="Take 1 damage"
                                    >-1</button>
                                    <button 
                                        class="hp-btn damage-btn" 
                                        onclick={() => adjustHP(index, -5)}
                                        title="Take 5 damage"
                                    >-5</button>
                                    <button 
                                        class="hp-btn heal-btn" 
                                        onclick={() => adjustHP(index, 1)}
                                        title="Heal 1 HP"
                                    >+1</button>
                                    <button 
                                        class="hp-btn heal-btn" 
                                        onclick={() => adjustHP(index, 5)}
                                        title="Heal 5 HP"
                                    >+5</button>
                                </div>
                            </div>
                        </div>
                        <button onclick={() => removeEntry(index)} class="remove-btn">×</button>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}

    <!-- Lookup Modal -->
    {#if showLookupModal}
        <div class="modal-backdrop" 
             onclick={() => showLookupModal = false}
             onkeydown={(e) => e.key === 'Escape' && (showLookupModal = false)}
             role="button"
             tabindex="-1">
            <div class="modal" 
                 onclick={(e) => e.stopPropagation()}
                 onkeydown={(e) => e.stopPropagation()}
                 role="dialog"
                 tabindex="-1">
                <div class="modal-header">
                    <h3>Add Character or Monster</h3>
                    <button onclick={() => showLookupModal = false} class="close-btn">×</button>
                </div>
                <div class="modal-content">
                    {#if savedCharacters.length > 0}
                        <div class="entity-section">
                            <h4>📚 Saved Characters</h4>
                            <div class="entity-grid">
                                {#each savedCharacters as character}
                                    <div class="entity-card character">
                                        <div class="entity-info">
                                            <strong>{character.name}</strong>
                                            <span>Level {character.level} {character.race} {character.class}</span>
                                        </div>
                                        <button onclick={() => addEntityToInitiative(character, 'character')} class="add-btn">Add</button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                    
                    {#if monsters.length > 0}
                        <div class="entity-section">
                            <h4>👹 Monsters</h4>
                            <div class="entity-grid">
                                {#each monsters as monster}
                                    <div class="entity-card monster">
                                        <div class="entity-info">
                                            <strong>{monster.name}</strong>
                                            <div class="monster-stats">
                                                <span>CR {monster.challenge_rating}</span>
                                                {#if monster.size && (monster.creature_type || monster.type)}
                                                    <span>• {monster.size} {monster.creature_type || monster.type}</span>
                                                {/if}
                                                {#if monster.armor_class}
                                                    <span>• AC {monster.armor_class}</span>
                                                {/if}
                                                {#if monster.hit_points}
                                                    <span>• HP {monster.hit_points}</span>
                                                {/if}
                                            </div>
                                            {#if monster.description}
                                                <span class="monster-desc">{monster.description}</span>
                                            {/if}
                                        </div>
                                        <button onclick={() => addEntityToInitiative(monster, 'monster')} class="add-btn">Add</button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Entity Details Modal -->
    {#if showEntityModal && selectedEntity}
        <div class="modal-backdrop" 
             onclick={() => showEntityModal = false}
             onkeydown={(e) => e.key === 'Escape' && (showEntityModal = false)}
             role="button"
             tabindex="-1">
            <div class="modal entity-details" 
                 onclick={(e) => e.stopPropagation()}
                 onkeydown={(e) => e.stopPropagation()}
                 role="dialog"
                 tabindex="-1">
                <div class="modal-header">
                    <h3>{selectedEntity.name} {selectedEntity.type === 'character' ? '👤' : selectedEntity.type === 'monster' ? '👹' : '⚔️'}</h3>
                    <button onclick={() => showEntityModal = false} class="close-btn">×</button>
                </div>
                <div class="modal-content">
                    {#if selectedEntity.type === 'character'}
                        <div class="character-details">
                            <!-- Basic Character Info -->
                            <div class="character-header">
                                <div class="character-basic">
                                    <div class="detail-row">
                                        <strong>Level:</strong> {selectedEntity.level}
                                    </div>
                                    <div class="detail-row">
                                        <strong>Class:</strong> {selectedEntity.class}
                                    </div>
                                    <div class="detail-row">
                                        <strong>Race:</strong> {selectedEntity.race}
                                    </div>
                                    {#if selectedEntity.background}
                                        <div class="detail-row">
                                            <strong>Background:</strong> {selectedEntity.background}
                                        </div>
                                    {/if}
                                </div>
                                
                                <!-- Combat Stats -->
                                <div class="combat-stats">
                                    {#if selectedEntity.armorClass}
                                        <div class="stat-box">
                                            <strong>AC</strong>
                                            <span class="stat-value">{selectedEntity.armorClass}</span>
                                        </div>
                                    {/if}
                                    {#if selectedEntity.hitPoints}
                                        <div class="stat-box">
                                            <strong>HP</strong>
                                            <span class="stat-value">{selectedEntity.hitPoints.current}/{selectedEntity.hitPoints.maximum}</span>
                                        </div>
                                    {/if}
                                    {#if selectedEntity.initiativeBonus}
                                        <div class="stat-box">
                                            <strong>Init</strong>
                                            <span class="stat-value">+{selectedEntity.initiativeBonus}</span>
                                        </div>
                                    {/if}
                                    {#if selectedEntity.passivePerception}
                                        <div class="stat-box">
                                            <strong>PP</strong>
                                            <span class="stat-value">{selectedEntity.passivePerception}</span>
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <!-- Ability Scores -->
                            {#if selectedEntity.stats}
                                <div class="ability-scores">
                                    <h4>Ability Scores</h4>
                                    <div class="stats-grid">
                                        <div class="ability-score">
                                            <strong>STR</strong>
                                            <span class="score">{selectedEntity.stats.strength}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.strength - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.strength - 10) / 2)})</span>
                                        </div>
                                        <div class="ability-score">
                                            <strong>DEX</strong>
                                            <span class="score">{selectedEntity.stats.dexterity}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.dexterity - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.dexterity - 10) / 2)})</span>
                                        </div>
                                        <div class="ability-score">
                                            <strong>CON</strong>
                                            <span class="score">{selectedEntity.stats.constitution}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.constitution - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.constitution - 10) / 2)})</span>
                                        </div>
                                        <div class="ability-score">
                                            <strong>INT</strong>
                                            <span class="score">{selectedEntity.stats.intelligence}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.intelligence - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.intelligence - 10) / 2)})</span>
                                        </div>
                                        <div class="ability-score">
                                            <strong>WIS</strong>
                                            <span class="score">{selectedEntity.stats.wisdom}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.wisdom - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.wisdom - 10) / 2)})</span>
                                        </div>
                                        <div class="ability-score">
                                            <strong>CHA</strong>
                                            <span class="score">{selectedEntity.stats.charisma}</span>
                                            <span class="modifier">({Math.floor((selectedEntity.stats.charisma - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.stats.charisma - 10) / 2)})</span>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            <!-- Weapons & Combat -->
                            {#if selectedEntity.items && selectedEntity.items.length > 0}
                                {@const weapons = selectedEntity.items.filter(item => {
                                    if (!item.name) return false;
                                    const name = item.name.toLowerCase();
                                    const desc = item.description?.toLowerCase() || '';
                                    
                                    // Common weapon names
                                    const weaponNames = [
                                        'sword', 'blade', 'bow', 'crossbow', 'dagger', 'knife', 'axe', 'hatchet',
                                        'mace', 'hammer', 'spear', 'lance', 'javelin', 'staff', 'wand', 'rod',
                                        'scimitar', 'rapier', 'cutlass', 'club', 'sling', 'dart', 'net', 'whip',
                                        'flail', 'glaive', 'halberd', 'pike', 'trident', 'warhammer', 'maul',
                                        'shortbow', 'longbow', 'handaxe', 'battleaxe', 'greataxe', 'greatsword',
                                        'shortsword', 'longsword', 'scimitar', 'handgun', 'pistol', 'musket'
                                    ];
                                    
                                    // Check if name contains weapon words
                                    const hasWeaponName = weaponNames.some(weapon => name.includes(weapon));
                                    
                                    // Check description for weapon-related terms
                                    const weaponTerms = ['weapon', 'attack', 'damage', 'hit', 'pierce', 'slash', 'bludgeon', 'ranged', 'melee'];
                                    const hasWeaponDesc = weaponTerms.some(term => desc.includes(term));
                                    
                                    return hasWeaponName || hasWeaponDesc;
                                })}
                                {#if weapons.length > 0}
                                    <div class="features-section">
                                        <h4>⚔️ Weapons & Combat</h4>
                                        <div class="weapons-list">
                                            {#each weapons as weapon}
                                                <div class="weapon-item">
                                                    <div class="weapon-header">
                                                        <strong>{weapon.name}</strong>
                                                        {#if weapon.quantity > 1}
                                                            <span class="quantity">x{weapon.quantity}</span>
                                                        {/if}
                                                    </div>
                                                    {#if weapon.description}
                                                        <p class="weapon-desc">{weapon.description}</p>
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            {/if}

                            <!-- Spells -->
                            {#if selectedEntity.spells && selectedEntity.spells.length > 0}
                                <div class="features-section">
                                    <h4>✨ Spells</h4>
                                    <div class="spells-list">
                                        {#each selectedEntity.spells as spell}
                                            <div class="spell-item" 
                                                 class:clickable={spell.description && spell.description.length > 150}
                                                 onclick={() => spell.description && spell.description.length > 150 && showSpellDetails(spell)}
                                                 onkeydown={(e) => e.key === 'Enter' && spell.description && spell.description.length > 150 && showSpellDetails(spell)}
                                                 role={spell.description && spell.description.length > 150 ? "button" : undefined}
                                                 tabindex={spell.description && spell.description.length > 150 ? "0" : undefined}>
                                                <div class="spell-header">
                                                    <strong>{spell.name}</strong>
                                                    {#if spell.level !== undefined}
                                                        <span class="spell-level">Level {spell.level}</span>
                                                    {/if}
                                                    {#if spell.school}
                                                        <span class="spell-school">{spell.school}</span>
                                                    {/if}
                                                    {#if spell.description && spell.description.length > 150}
                                                        <span class="expand-indicator">🔍 Click for details</span>
                                                    {/if}
                                                </div>
                                                {#if spell.description}
                                                    <p class="spell-desc">
                                                        {spell.description.length > 150 ? spell.description.substring(0, 150) + '...' : spell.description}
                                                    </p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Features -->
                            {#if selectedEntity.class_features && selectedEntity.class_features.length > 0}
                                <div class="features-section">
                                    <h4>Class Features</h4>
                                    <div class="features-list">
                                        {#each selectedEntity.class_features as feature}
                                            <div class="feature-item">
                                                <strong>{feature.name}</strong>
                                                {#if feature.description}
                                                    <p class="feature-desc">{feature.description.length > 100 ? feature.description.substring(0, 100) + '...' : feature.description}</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            {#if selectedEntity.race_features && selectedEntity.race_features.length > 0}
                                <div class="features-section">
                                    <h4>Racial Features</h4>
                                    <div class="features-list">
                                        {#each selectedEntity.race_features as feature}
                                            <div class="feature-item">
                                                <strong>{feature.name}</strong>
                                                {#if feature.description}
                                                    <p class="feature-desc">{feature.description.length > 100 ? feature.description.substring(0, 100) + '...' : feature.description}</p>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Items & Equipment -->
                            {#if selectedEntity.items && selectedEntity.items.length > 0}
                                {@const nonWeaponItems = selectedEntity.items.filter(item => {
                                    if (!item.name) return true;
                                    const name = item.name.toLowerCase();
                                    const desc = item.description?.toLowerCase() || '';
                                    
                                    // Common weapon names (same as above)
                                    const weaponNames = [
                                        'sword', 'blade', 'bow', 'crossbow', 'dagger', 'knife', 'axe', 'hatchet',
                                        'mace', 'hammer', 'spear', 'lance', 'javelin', 'staff', 'wand', 'rod',
                                        'scimitar', 'rapier', 'cutlass', 'club', 'sling', 'dart', 'net', 'whip',
                                        'flail', 'glaive', 'halberd', 'pike', 'trident', 'warhammer', 'maul',
                                        'shortbow', 'longbow', 'handaxe', 'battleaxe', 'greataxe', 'greatsword',
                                        'shortsword', 'longsword', 'scimitar', 'handgun', 'pistol', 'musket'
                                    ];
                                    
                                    const hasWeaponName = weaponNames.some(weapon => name.includes(weapon));
                                    const weaponTerms = ['weapon', 'attack', 'damage', 'hit', 'pierce', 'slash', 'bludgeon', 'ranged', 'melee'];
                                    const hasWeaponDesc = weaponTerms.some(term => desc.includes(term));
                                    
                                    return !(hasWeaponName || hasWeaponDesc);
                                })}
                                {#if nonWeaponItems.length > 0}
                                    <div class="features-section">
                                        <h4>🎒 Items & Equipment</h4>
                                        <div class="items-list">
                                            {#each nonWeaponItems as item}
                                                <div class="item">
                                                    <strong>{item.name}</strong>
                                                    {#if item.quantity > 1}
                                                        <span class="quantity">x{item.quantity}</span>
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            {/if}

                            <!-- Notes -->
                            {#if selectedEntity.notes}
                                <div class="features-section">
                                    <h4>Notes</h4>
                                    <p class="notes">{selectedEntity.notes}</p>
                                </div>
                            {/if}
                        </div>
                    {:else if selectedEntity.type === 'monster'}
                        <div class="monster-details">
                            <!-- Monster Header -->
                            <div class="monster-header">
                                <div class="monster-basic">
                                    <div class="detail-row">
                                        <strong>Size:</strong> {selectedEntity.size} {selectedEntity.creature_type || selectedEntity.monsterType || 'creature'}{selectedEntity.subtype ? `, ${selectedEntity.subtype}` : ''}
                                    </div>
                                    <div class="detail-row">
                                        <strong>Alignment:</strong> {selectedEntity.alignment}
                                    </div>
                                </div>
                                
                                <!-- Combat Stats -->
                                <div class="combat-stats">
                                    <div class="stat-box">
                                        <strong>AC</strong>
                                        <span class="stat-value">{selectedEntity.armor_class}</span>
                                        {#if selectedEntity.armor_desc}
                                            <span class="stat-detail">({selectedEntity.armor_desc})</span>
                                        {/if}
                                    </div>
                                    <div class="stat-box">
                                        <strong>HP</strong>
                                        <span class="stat-value">{selectedEntity.hit_points}</span>
                                        {#if selectedEntity.hit_dice}
                                            <span class="stat-detail">({selectedEntity.hit_dice})</span>
                                        {/if}
                                    </div>
                                    <div class="stat-box">
                                        <strong>CR</strong>
                                        <span class="stat-value">{selectedEntity.challenge_rating}</span>
                                        <span class="stat-detail">({selectedEntity.experience_points} XP)</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Speed -->
                            {#if selectedEntity.speed}
                                <div class="monster-section">
                                    <strong>Speed:</strong>
                                    <span>
                                        {#if selectedEntity.speed.walk}Walk {selectedEntity.speed.walk} ft.{/if}
                                        {#if selectedEntity.speed.climb}, Climb {selectedEntity.speed.climb} ft.{/if}
                                        {#if selectedEntity.speed.fly}, Fly {selectedEntity.speed.fly} ft.{/if}
                                        {#if selectedEntity.speed.swim}, Swim {selectedEntity.speed.swim} ft.{/if}
                                        {#if selectedEntity.speed.burrow}, Burrow {selectedEntity.speed.burrow} ft.{/if}
                                    </span>
                                </div>
                            {/if}

                            <!-- Ability Scores -->
                            <div class="ability-scores">
                                <h4>Ability Scores</h4>
                                <div class="stats-grid">
                                    <div class="ability-score">
                                        <strong>STR</strong>
                                        <span class="score">{selectedEntity.strength}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.strength - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.strength - 10) / 2)})</span>
                                    </div>
                                    <div class="ability-score">
                                        <strong>DEX</strong>
                                        <span class="score">{selectedEntity.dexterity}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.dexterity - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.dexterity - 10) / 2)})</span>
                                    </div>
                                    <div class="ability-score">
                                        <strong>CON</strong>
                                        <span class="score">{selectedEntity.constitution}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.constitution - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.constitution - 10) / 2)})</span>
                                    </div>
                                    <div class="ability-score">
                                        <strong>INT</strong>
                                        <span class="score">{selectedEntity.intelligence}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.intelligence - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.intelligence - 10) / 2)})</span>
                                    </div>
                                    <div class="ability-score">
                                        <strong>WIS</strong>
                                        <span class="score">{selectedEntity.wisdom}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.wisdom - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.wisdom - 10) / 2)})</span>
                                    </div>
                                    <div class="ability-score">
                                        <strong>CHA</strong>
                                        <span class="score">{selectedEntity.charisma}</span>
                                        <span class="modifier">({Math.floor((selectedEntity.charisma - 10) / 2) >= 0 ? '+' : ''}{Math.floor((selectedEntity.charisma - 10) / 2)})</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Saving Throws -->
                            {#if selectedEntity.saving_throws && Object.keys(selectedEntity.saving_throws).length > 0}
                                <div class="monster-section">
                                    <strong>Saving Throws:</strong>
                                    <span>
                                        {#each Object.entries(selectedEntity.saving_throws) as [ability, bonus], index}
                                            {ability.charAt(0).toUpperCase() + ability.slice(1)} +{bonus}{index < Object.entries(selectedEntity.saving_throws).length - 1 ? ', ' : ''}
                                        {/each}
                                    </span>
                                </div>
                            {/if}

                            <!-- Skills -->
                            {#if selectedEntity.skills && Object.keys(selectedEntity.skills).length > 0}
                                <div class="monster-section">
                                    <strong>Skills:</strong>
                                    <span>
                                        {#each Object.entries(selectedEntity.skills) as [skill, bonus], index}
                                            {skill.charAt(0).toUpperCase() + skill.slice(1)} +{bonus}{index < Object.entries(selectedEntity.skills).length - 1 ? ', ' : ''}
                                        {/each}
                                    </span>
                                </div>
                            {/if}

                            <!-- Damage Immunities/Resistances/Vulnerabilities -->
                            {#if selectedEntity.damage_immunities && selectedEntity.damage_immunities.length > 0}
                                <div class="monster-section">
                                    <strong>Damage Immunities:</strong>
                                    <span>{selectedEntity.damage_immunities.join(', ')}</span>
                                </div>
                            {/if}
                            {#if selectedEntity.damage_resistances && selectedEntity.damage_resistances.length > 0}
                                <div class="monster-section">
                                    <strong>Damage Resistances:</strong>
                                    <span>{selectedEntity.damage_resistances.join(', ')}</span>
                                </div>
                            {/if}
                            {#if selectedEntity.damage_vulnerabilities && selectedEntity.damage_vulnerabilities.length > 0}
                                <div class="monster-section">
                                    <strong>Damage Vulnerabilities:</strong>
                                    <span>{selectedEntity.damage_vulnerabilities.join(', ')}</span>
                                </div>
                            {/if}

                            <!-- Condition Immunities -->
                            {#if selectedEntity.condition_immunities && selectedEntity.condition_immunities.length > 0}
                                <div class="monster-section">
                                    <strong>Condition Immunities:</strong>
                                    <span>{selectedEntity.condition_immunities.join(', ')}</span>
                                </div>
                            {/if}

                            <!-- Senses -->
                            {#if selectedEntity.senses}
                                <div class="monster-section">
                                    <strong>Senses:</strong>
                                    <span>{selectedEntity.senses}</span>
                                </div>
                            {/if}

                            <!-- Languages -->
                            {#if selectedEntity.languages}
                                <div class="monster-section">
                                    <strong>Languages:</strong>
                                    <span>{selectedEntity.languages || '—'}</span>
                                </div>
                            {/if}

                            <!-- Special Abilities -->
                            {#if selectedEntity.special_abilities && selectedEntity.special_abilities.length > 0}
                                <div class="features-section">
                                    <h4>Special Abilities</h4>
                                    <div class="features-list">
                                        {#each selectedEntity.special_abilities as ability}
                                            <div class="feature-item">
                                                <strong>{ability.name}.</strong>
                                                <span class="feature-desc">{ability.desc}</span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Actions -->
                            {#if selectedEntity.actions && selectedEntity.actions.length > 0}
                                <div class="features-section">
                                    <h4>Actions</h4>
                                    <div class="features-list">
                                        {#each selectedEntity.actions as action}
                                            <div class="feature-item action-item">
                                                <strong>{action.name}.</strong>
                                                <span class="feature-desc">{action.desc}</span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Legendary Actions -->
                            {#if selectedEntity.legendary_actions && selectedEntity.legendary_actions.length > 0}
                                <div class="features-section">
                                    <h4>Legendary Actions</h4>
                                    <div class="features-list">
                                        {#each selectedEntity.legendary_actions as action}
                                            <div class="feature-item legendary-item">
                                                <strong>{action.name}.</strong>
                                                <span class="feature-desc">{action.desc}</span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Description/Notes -->
                            {#if selectedEntity.description || selectedEntity.notes}
                                <div class="features-section">
                                    <h4>Description</h4>
                                    <p class="notes">{selectedEntity.description || selectedEntity.notes}</p>
                                </div>
                            {/if}
                        </div>
                    {:else if selectedEntity.type === 'manual'}
                        <div class="manual-entry-details">
                            <div class="manual-info">
                                <h4>⚔️ Combat Participant</h4>
                                <p>This is a manually added entry to the initiative tracker.</p>
                                <div class="detail-row">
                                    <strong>Current Initiative:</strong> {selectedEntity.initiative}
                                </div>
                                <div class="manual-note">
                                    <p><em>💡 Tip: For full character details, add characters through the "📚 Lookup" button instead of manual entry.</em></p>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Spell Details Modal -->
    {#if showSpellModal && selectedSpell}
        <div class="modal-backdrop" 
             onclick={() => showSpellModal = false}
             onkeydown={(e) => e.key === 'Escape' && (showSpellModal = false)}
             role="button"
             tabindex="-1">
            <div class="modal spell-details" 
                 onclick={(e) => e.stopPropagation()}
                 onkeydown={(e) => e.stopPropagation()}
                 role="dialog"
                 tabindex="-1">
                <div class="modal-header">
                    <h3>✨ {selectedSpell.name}</h3>
                    <button onclick={() => showSpellModal = false} class="close-btn">×</button>
                </div>
                <div class="modal-content">
                    <div class="spell-full-details">
                        <div class="spell-meta">
                            {#if selectedSpell.level !== undefined}
                                <div class="spell-detail-item">
                                    <strong>Level:</strong> {selectedSpell.level === 0 ? 'Cantrip' : selectedSpell.level}
                                </div>
                            {/if}
                            {#if selectedSpell.school}
                                <div class="spell-detail-item">
                                    <strong>School:</strong> {selectedSpell.school}
                                </div>
                            {/if}
                            {#if selectedSpell.casting_time}
                                <div class="spell-detail-item">
                                    <strong>Casting Time:</strong> {selectedSpell.casting_time}
                                </div>
                            {/if}
                            {#if selectedSpell.range}
                                <div class="spell-detail-item">
                                    <strong>Range:</strong> {selectedSpell.range}
                                </div>
                            {/if}
                            {#if selectedSpell.components}
                                <div class="spell-detail-item">
                                    <strong>Components:</strong> {selectedSpell.components}
                                </div>
                            {/if}
                            {#if selectedSpell.duration}
                                <div class="spell-detail-item">
                                    <strong>Duration:</strong> {selectedSpell.duration}
                                </div>
                            {/if}
                        </div>
                        {#if selectedSpell.description}
                            <div class="spell-description">
                                <h4>Description</h4>
                                <p>{selectedSpell.description}</p>
                            </div>
                        {/if}
                        {#if selectedSpell.higher_level}
                            <div class="spell-higher-level">
                                <h4>At Higher Levels</h4>
                                <p>{selectedSpell.higher_level}</p>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .initiative-tracker {
        max-width: 600px;
        margin: 0 auto;
    }

    .tracker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .save-status {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        animation: fadeInOut 3s ease-in-out;
        white-space: nowrap;
    }

    .save-status.success {
        background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
        color: #2e7d32;
        border: 1px solid #4caf50;
    }

    .save-status.error {
        background: linear-gradient(135deg, #ffcdd2, #ef9a9a);
        color: #c62828;
        border: 1px solid #f44336;
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
    }

    .initiative-tracker h3 {
        margin: 0;
        color: #333;
    }

    .dice-btn {
        background-color: #9C27B0;
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .dice-btn:hover {
        background-color: #7B1FA2;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    /* Mini Dice Roller */
    .mini-dice-roller {
        background: linear-gradient(135deg, #f3e5f5, #e1bee7);
        border: 2px solid #9C27B0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 8px rgba(156, 39, 176, 0.2);
    }

    .dice-input-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .dice-input {
        flex: 1;
        padding: 0.5rem;
        font-size: 0.9rem;
        border: 1px solid #ba68c8;
        border-radius: 4px;
        background: white;
    }

    .dice-input:focus {
        outline: none;
        border-color: #9C27B0;
        box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
    }

    .roll-btn {
        background-color: #9C27B0;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
    }

    .roll-btn:hover {
        background-color: #7B1FA2;
        transform: translateY(-1px);
    }

    .close-btn {
        background-color: #f44336;
        color: white;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .close-btn:hover {
        background-color: #d32f2f;
        transform: scale(1.1);
    }

    .dice-result {
        background: white;
        padding: 0.75rem;
        border-radius: 4px;
        border: 1px solid #ba68c8;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        color: #4A148C;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .initiative-input {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
    }
    
    .initiative-input input[type="text"], 
    .initiative-input input[type="number"] {
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        flex: 1;
        min-width: 150px;
    }
    
    .initiative-input button {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .initiative-input button:first-of-type {
        background-color: #4CAF50;
        color: white;
    }

    .initiative-input button:first-of-type:hover {
        background-color: #45a049;
    }

    .clear-btn {
        background-color: #f44336 !important;
        color: white !important;
    }

    .clear-btn:hover {
        background-color: #d32f2f !important;
    }

    /* Initiative Track */
    .initiative-track {
        margin: 2rem 0;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 12px;
        border: 2px solid #4CAF50;
    }

    .track-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .track-controls h4 {
        margin: 0;
        color: #333;
        font-size: 1.1rem;
    }

    .track-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .play-btn, .next-btn, .reset-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .play-btn {
        background-color: #4CAF50;
        color: white;
    }

    .play-btn:hover {
        background-color: #45a049;
        transform: translateY(-1px);
    }

    .next-btn {
        background-color: #2196F3;
        color: white;
    }

    .next-btn:hover {
        background-color: #1976D2;
        transform: translateY(-1px);
    }

    .reset-btn {
        background-color: #FF9800;
        color: white;
    }

    .reset-btn:hover {
        background-color: #F57C00;
        transform: translateY(-1px);
    }

    .character-track {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
        margin: 1rem 0;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
    }

    .character-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .character-circle {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e3f2fd, #bbdefb);
        border: 3px solid #2196F3;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .character-hp {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        min-width: 60px;
    }

    .hp-text {
        font-size: 0.8rem;
        font-weight: bold;
        color: #333;
        white-space: nowrap;
    }

    .hp-bar {
        width: 40px;
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
    }

    .hp-fill {
        height: 100%;
        background: linear-gradient(90deg, #f44336 0%, #ff9800 50%, #4CAF50 100%);
        transition: width 0.3s ease;
        border-radius: 3px;
    }

    .character-circle:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .character-circle.active {
        background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
        border-color: #4CAF50;
        border-width: 4px;
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% { box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4); }
        50% { box-shadow: 0 4px 20px rgba(76, 175, 80, 0.6); }
        100% { box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4); }
    }

    .initials {
        font-weight: bold;
        font-size: 1rem;
        color: #333;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }

    .initiative-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #FF5722;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .current-turn {
        text-align: center;
        padding: 1rem;
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
        border: 2px solid #FF9800;
        border-radius: 8px;
        font-size: 1.2rem;
        color: #E65100;
        animation: glow 1.5s ease-in-out infinite alternate;
    }

    @keyframes glow {
        from { box-shadow: 0 0 5px rgba(255, 152, 0, 0.5); }
        to { box-shadow: 0 0 15px rgba(255, 152, 0, 0.8); }
    }

    .empty-message {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 2rem;
        background: #f9f9f9;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
    }

    .initiative-list h4 {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.2rem;
    }

    .initiative-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .initiative-entry {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        transition: all 0.2s ease;
        gap: 1rem;
    }

    .initiative-entry:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-color: #4CAF50;
    }

    .entry-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 120px;
    }

    .entry-info strong {
        color: #333;
        font-size: 1.1rem;
    }

    .initiative-value {
        background: #4CAF50;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-weight: bold;
        font-size: 0.9rem;
        width: fit-content;
        text-align: center;
    }

    /* HP Controls */
    .hp-controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
    }

    .hp-display {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
    }

    .hp-inputs {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: #f8f9fa;
        padding: 0.5rem;
        border-radius: 6px;
        border: 1px solid #ddd;
    }

    .hp-input {
        width: 45px;
        padding: 0.25rem;
        text-align: center;
        border: 1px solid #ccc;
        border-radius: 3px;
        font-size: 0.9rem;
        font-weight: bold;
    }

    .hp-input.current-hp {
        border-color: #f44336;
        background: #ffebee;
    }

    .hp-input.max-hp {
        border-color: #4CAF50;
        background: #e8f5e8;
    }

    .hp-input:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
    }

    .hp-separator {
        font-weight: bold;
        color: #666;
        margin: 0 0.25rem;
    }

    .hp-buttons {
        display: flex;
        gap: 0.25rem;
    }

    .hp-btn {
        padding: 0.25rem 0.5rem;
        border: none;
        border-radius: 3px;
        font-size: 0.8rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 30px;
    }

    .damage-btn {
        background: #f44336;
        color: white;
    }

    .damage-btn:hover {
        background: #d32f2f;
        transform: translateY(-1px);
    }

    .heal-btn {
        background: #4CAF50;
        color: white;
    }

    .heal-btn:hover {
        background: #45a049;
        transform: translateY(-1px);
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
        margin-left: 1rem;
    }

    .remove-btn:hover {
        background-color: #d32f2f;
        transform: scale(1.1);
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
        .initiative-tracker h3 {
            color: #f6f6f6;
        }

        .save-status.success {
            background: linear-gradient(135deg, #2e7d32, #388e3c);
            color: #c8e6c9;
            border-color: #4caf50;
        }

        .save-status.error {
            background: linear-gradient(135deg, #c62828, #d32f2f);
            color: #ffcdd2;
            border-color: #f44336;
        }

        .dice-btn {
            background-color: #9C27B0;
        }

        .dice-btn:hover {
            background-color: #7B1FA2;
        }

        /* Dark mode for mini dice roller */
        .mini-dice-roller {
            background: linear-gradient(135deg, #2e1a2e, #3d2a3d);
            border-color: #9C27B0;
        }

        .dice-input {
            background-color: #404040;
            border-color: #ba68c8;
            color: #f6f6f6;
        }

        .dice-input:focus {
            border-color: #9C27B0;
        }

        .dice-result {
            background-color: #404040;
            border-color: #ba68c8;
            color: #e1bee7;
        }

        .initiative-list h4 {
            color: #f6f6f6;
        }

        .initiative-input input {
            background-color: #404040;
            border-color: #666;
            color: #f6f6f6;
        }

        .empty-message {
            background-color: #2f2f2f;
            border-color: #555;
            color: #ccc;
        }

        .initiative-entry {
            background-color: #404040;
            border-color: #666;
        }

        .initiative-entry:hover {
            border-color: #4CAF50;
        }

        .entry-info strong {
            color: #f6f6f6;
        }

        .hp-inputs {
            background: #2f2f2f;
            border-color: #555;
        }

        .hp-input {
            background: #404040;
            border-color: #666;
            color: #f6f6f6;
        }

        .hp-input.current-hp {
            background: #4a2c2c;
            border-color: #f44336;
        }

        .hp-input.max-hp {
            background: #2c4a2c;
            border-color: #4CAF50;
        }

        .hp-separator {
            color: #ccc;
        }

        .hp-text {
            color: #f6f6f6;
        }

        .hp-bar {
            background: #555;
        }

        /* Dark mode for initiative track */
        .initiative-track {
            background-color: #2f2f2f;
            border-color: #4CAF50;
        }

        .track-controls h4 {
            color: #f6f6f6;
        }

        .character-track {
            background-color: #404040;
            border-color: #666;
        }

        .character-circle {
            background: linear-gradient(135deg, #424242, #616161);
            border-color: #2196F3;
        }

        .character-circle.active {
            background: linear-gradient(135deg, #388e3c, #66bb6a);
        }

        .initials {
            color: #f6f6f6;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }

        .hp-text {
            color: #f6f6f6;
        }

        .hp-bar {
            background: #555;
        }

        .current-turn {
            background: linear-gradient(135deg, #3e2723, #5d4037);
            border-color: #FF9800;
            color: #FFB74D;
        }
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .initiative-input {
            flex-direction: column;
        }

        .initiative-input input,
        .initiative-input button {
            min-width: 100%;
        }

        .initiative-entry {
            flex-direction: column;
            gap: 0.5rem;
            align-items: stretch;
        }

        .entry-info {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }

        .hp-controls {
            align-self: center;
        }

        .hp-display {
            flex-direction: row;
            gap: 1rem;
        }

        .initiative-value {
            align-self: flex-end;
        }

        /* Mobile responsive for initiative track */
        .track-controls {
            flex-direction: column;
            gap: 1rem;
            align-items: center;
        }

        .tracker-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }

        .header-actions {
            justify-content: center;
        }

        .save-status {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
        }

        .dice-input-row {
            flex-direction: column;
            gap: 0.5rem;
        }

        .dice-input,
        .roll-btn {
            width: 100%;
        }

        .character-track {
            gap: 0.5rem;
        }

        .character-circle {
            width: 50px;
            height: 50px;
        }

        .initials {
            font-size: 0.9rem;
        }

        .initiative-badge {
            width: 20px;
            height: 20px;
            font-size: 0.7rem;
            top: -6px;
            right: -6px;
        }

        .current-turn {
            font-size: 1rem;
            padding: 0.75rem;
        }
    }

    /* Lookup button */
    .lookup-btn {
        background-color: #2196F3;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s ease;
    }

    .lookup-btn:hover {
        background-color: #1976D2;
    }

    .refresh-btn {
        background-color: #FF9800;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s ease;
    }

    .refresh-btn:hover {
        background-color: #F57C00;
    }

    /* Character circle enhancements */
    .character-circle {
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
    }

    .character-circle:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .character-circle.character {
        border-color: #4CAF50;
    }

    .character-circle.monster {
        border-color: #f44336;
    }

    .type-indicator {
        position: absolute;
        bottom: -2px;
        right: -2px;
        background: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6rem;
        border: 1px solid #ddd;
    }

    /* Modal styling */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
    }

    .modal-header h3 {
        margin: 0;
        color: #333;
    }

    .modal-content {
        padding: 1rem;
        overflow-y: auto;
        flex: 1;
    }

    .entity-section {
        margin-bottom: 2rem;
    }

    .entity-section h4 {
        margin: 0 0 1rem 0;
        color: #333;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0.5rem;
    }

    .entity-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }

    .entity-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .entity-card:hover {
        border-color: #2196F3;
        box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
    }

    .entity-card.character {
        border-left: 4px solid #4CAF50;
    }

    .entity-card.monster {
        border-left: 4px solid #f44336;
    }

    .entity-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .entity-info span {
        font-size: 0.9rem;
        color: #666;
    }

    .monster-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.5rem 0;
        font-size: 0.8rem;
        color: #888;
    }

    .monster-desc {
        color: #666;
        font-size: 0.85rem;
        font-style: italic;
        margin-top: 0.5rem;
        line-height: 1.3;
    }

    .add-btn {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s ease;
    }

    .add-btn:hover {
        background-color: #45a049;
    }

    /* Entity details modal */
    .entity-details {
        max-width: 700px;
        max-height: 90vh;
    }

    .character-details, .monster-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .character-header, .monster-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 2rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
    }

    .character-basic, .monster-basic {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    /* Monster-specific sections */
    .monster-section {
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 4px;
        border-left: 3px solid #FF5722;
        margin-bottom: 0.5rem;
    }

    .monster-section strong {
        color: #333;
        margin-right: 0.5rem;
    }

    .monster-section span {
        color: #666;
    }

    .stat-detail {
        font-size: 0.8rem;
        color: #888;
        display: block;
        margin-top: 0.2rem;
    }

    .combat-stats {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
    }

    .stat-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.75rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        min-width: 60px;
    }

    .stat-box strong {
        font-size: 0.8rem;
        color: #666;
        margin-bottom: 0.25rem;
    }

    .stat-value {
        font-size: 1.2rem;
        font-weight: bold;
        color: #333;
    }

    .ability-scores h4 {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.1rem;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0.5rem;
    }

    .ability-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        text-align: center;
    }

    .ability-score strong {
        font-size: 0.8rem;
        color: #666;
        margin-bottom: 0.5rem;
    }

    .score {
        font-size: 1.5rem;
        font-weight: bold;
        color: #333;
        margin-bottom: 0.25rem;
    }

    .modifier {
        font-size: 0.9rem;
        color: #666;
    }

    .features-section {
        border-top: 1px solid #e0e0e0;
        padding-top: 1rem;
    }

    .features-section h4 {
        margin: 0 0 0.75rem 0;
        color: #333;
        font-size: 1rem;
    }

    .features-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .feature-item {
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 4px;
        border-left: 3px solid #2196F3;
    }

    .action-item {
        border-left-color: #FF5722;
        background: #fff3e0;
    }

    .legendary-item {
        border-left-color: #9C27B0;
        background: #f3e5f5;
    }

    .feature-desc {
        margin: 0.5rem 0 0 0;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.4;
    }

    /* Weapons Section */
    .weapons-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .weapon-item {
        padding: 0.75rem;
        background: #fff3e0;
        border-radius: 4px;
        border-left: 3px solid #FF5722;
    }

    .weapon-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .weapon-desc {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.4;
    }

    /* Spells Section */
    .spells-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .spell-item {
        padding: 0.75rem;
        background: #f3e5f5;
        border-radius: 4px;
        border-left: 3px solid #9C27B0;
        transition: all 0.2s ease;
    }

    .spell-item.clickable {
        cursor: pointer;
    }

    .spell-item.clickable:hover {
        background: #e8d5ea;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .spell-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .spell-level {
        background: #9C27B0;
        color: white;
        padding: 0.1rem 0.4rem;
        border-radius: 10px;
        font-size: 0.75rem;
        font-weight: bold;
    }

    .spell-school {
        background: #e1bee7;
        color: #4a148c;
        padding: 0.1rem 0.4rem;
        border-radius: 10px;
        font-size: 0.75rem;
        font-weight: bold;
    }

    .expand-indicator {
        background: #ffc107;
        color: #333;
        padding: 0.1rem 0.4rem;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: bold;
        margin-left: auto;
    }

    .spell-desc {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.4;
    }

    /* Spell Details Modal */
    .spell-details {
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    }

    .spell-full-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .spell-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #9C27B0;
    }

    .spell-detail-item {
        display: flex;
        gap: 0.5rem;
    }

    .spell-detail-item strong {
        color: #333;
        min-width: fit-content;
    }

    .spell-description, .spell-higher-level {
        padding: 1rem;
        background: #f3e5f5;
        border-radius: 6px;
        border-left: 3px solid #9C27B0;
    }

    .spell-description h4, .spell-higher-level h4 {
        margin: 0 0 0.5rem 0;
        color: #333;
        font-size: 1rem;
    }

    .spell-description p, .spell-higher-level p {
        margin: 0;
        line-height: 1.6;
        color: #444;
        white-space: pre-wrap;
    }

    .items-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #f0f0f0;
        border-radius: 15px;
        font-size: 0.9rem;
    }

    .quantity {
        background: #2196F3;
        color: white;
        padding: 0.1rem 0.4rem;
        border-radius: 10px;
        font-size: 0.8rem;
    }

    .notes {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #4CAF50;
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        white-space: pre-wrap;
    }

    /* Manual entry details */
    .manual-entry-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
    }

    .manual-info h4 {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.2rem;
        text-align: center;
    }

    .manual-info p {
        text-align: center;
        color: #666;
        margin-bottom: 1rem;
    }

    .manual-note {
        background: #e3f2fd;
        border: 1px solid #90caf9;
        border-radius: 6px;
        padding: 1rem;
        margin-top: 1rem;
    }

    .manual-note p {
        margin: 0;
        color: #1565c0;
        font-size: 0.9rem;
        text-align: left;
    }

    .detail-row {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 4px;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }

    .stats-grid div {
        padding: 0.5rem;
        background: #f0f0f0;
        border-radius: 4px;
        text-align: center;
        font-size: 0.9rem;
    }

    @media (max-width: 768px) {
        .character-header, .monster-header {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .combat-stats {
            justify-content: center;
        }

        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (prefers-color-scheme: dark) {
        .modal {
            background: #2f2f2f;
            color: #f6f6f6;
        }

        .modal-header {
            background: #404040;
            border-bottom-color: #555;
        }

        .modal-header h3 {
            color: #f6f6f6;
        }

        .entity-section h4 {
            color: #f6f6f6;
            border-bottom-color: #555;
        }

        .entity-card {
            background: #404040;
            border-color: #666;
        }

        .entity-card:hover {
            border-color: #64b5f6;
        }

        .entity-info span {
            color: #ccc;
        }

        .monster-stats {
            color: #aaa;
        }

        .monster-desc {
            color: #ccc;
        }

        .detail-row {
            background: #404040;
        }

        .stats-grid div {
            background: #404040;
        }

        .character-header {
            background: #404040;
            border-color: #666;
        }

        .monster-header {
            background: #404040;
            border-color: #666;
        }

        .monster-section {
            background: #404040;
            border-left-color: #FF5722;
        }

        .monster-section strong {
            color: #f6f6f6;
        }

        .monster-section span {
            color: #ccc;
        }

        .stat-detail {
            color: #aaa;
        }

        .action-item {
            background: #4a3428;
            border-left-color: #FF5722;
        }

        .legendary-item {
            background: #3d2a3d;
            border-left-color: #9C27B0;
        }

        .stat-box {
            background: #2f2f2f;
            border-color: #555;
        }

        .stat-box strong {
            color: #ccc;
        }

        .stat-value {
            color: #f6f6f6;
        }

        .ability-scores h4 {
            color: #f6f6f6;
            border-bottom-color: #555;
        }

        .ability-score {
            background: #2f2f2f;
            border-color: #555;
        }

        .ability-score strong {
            color: #ccc;
        }

        .score {
            color: #f6f6f6;
        }

        .modifier {
            color: #ccc;
        }

        .features-section {
            border-top-color: #555;
        }

        .features-section h4 {
            color: #f6f6f6;
        }

        .feature-item {
            background: #404040;
            border-left-color: #64b5f6;
        }

        .feature-desc {
            color: #ccc;
        }

        .weapon-item {
            background: #4a3428;
            border-left-color: #FF5722;
        }

        .weapon-desc {
            color: #ccc;
        }

        .spell-item {
            background: #3d2a3d;
            border-left-color: #9C27B0;
        }

        .spell-item.clickable:hover {
            background: #4a2e4a;
        }

        .spell-desc {
            color: #ccc;
        }

        .spell-level {
            background: #9C27B0;
        }

        .spell-school {
            background: #6a1b9a;
            color: #e1bee7;
        }

        .expand-indicator {
            background: #ff8f00;
            color: #000;
        }

        .spell-meta {
            background: #404040;
            border-left-color: #9C27B0;
        }

        .spell-detail-item strong {
            color: #f6f6f6;
        }

        .spell-description, .spell-higher-level {
            background: #3d2a3d;
            border-left-color: #9C27B0;
        }

        .spell-description h4, .spell-higher-level h4 {
            color: #f6f6f6;
        }

        .spell-description p, .spell-higher-level p {
            color: #ccc;
        }

        .item {
            background: #404040;
            color: #f6f6f6;
        }

        .notes {
            background: #404040;
            border-left-color: #4CAF50;
            color: #f6f6f6;
        }

        .manual-entry-details {
            background: #404040;
            border-color: #666;
        }

        .manual-info h4 {
            color: #f6f6f6;
        }

        .manual-info p {
            color: #ccc;
        }

        .manual-note {
            background: #555;
            border-color: #777;
        }

        .manual-note p {
            color: #ccc;
        }
    }
</style>