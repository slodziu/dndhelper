<script>
    // @ts-nocheck
    import { onMount } from 'svelte';
    import { loadCharacters } from './characterStorage.js';
    
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

    function addEntry() {
        const trimmedName = name.trim();
        const initiativeValue = Number(initiative);
        
        console.log('Adding entry:', { trimmedName, initiative, initiativeValue, isNaN: isNaN(initiativeValue) });
        
        if (trimmedName && !isNaN(initiativeValue) && initiativeValue >= 0) {
            const newEntry = { name: trimmedName, initiative: initiativeValue, isActive: false, type: 'manual' };
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
            monsters = data.monsters || [];
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
        
        const newEntry = {
            name: entity.name,
            initiative: initiativeValue,
            isActive: false,
            type: entityType,
            data: entity
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
</script>

<div class="initiative-tracker">
    <div class="tracker-header">
        <h3>Initiative Tracker</h3>
        <button onclick={toggleMiniDiceRoller} class="dice-btn" title="Quick Dice Roller">
            🎲
        </button>
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
                                            <span>{monster.description}</span>
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

                            <!-- Items -->
                            {#if selectedEntity.items && selectedEntity.items.length > 0}
                                <div class="features-section">
                                    <h4>Items</h4>
                                    <div class="items-list">
                                        {#each selectedEntity.items as item}
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
                            <p>{selectedEntity.description}</p>
                            <!-- Add more monster details here if available -->
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
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin: 1rem 0;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
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
    }

    .initiative-entry:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-color: #4CAF50;
    }

    .entry-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex: 1;
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
        min-width: 40px;
        text-align: center;
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

        .entry-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
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

    .character-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 2rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
    }

    .character-basic {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
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

    .feature-desc {
        margin: 0.5rem 0 0 0;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.4;
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
        .character-header {
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