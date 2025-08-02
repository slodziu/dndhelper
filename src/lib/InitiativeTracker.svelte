<script>
    import { onMount } from 'svelte';
    
    let name = $state('');
    let initiative = $state('');
    
    /** @type {Array<{name: string, initiative: number}>} */
    let entries = $state([]);

    function addEntry() {
        const trimmedName = name.trim();
        const initiativeValue = Number(initiative);
        
        console.log('Adding entry:', { trimmedName, initiative, initiativeValue, isNaN: isNaN(initiativeValue) });
        
        if (trimmedName && !isNaN(initiativeValue) && initiativeValue >= 0) {
            const newEntry = { name: trimmedName, initiative: initiativeValue, isActive:false };
            entries = [...entries, newEntry].sort((a, b) => b.initiative - a.initiative);
            console.log('Entries after add:', entries);
            name = '';
            initiative = '';
        } else {
            console.log('Validation failed');
            alert('Please enter a valid name and initiative value (number >= 0)');
        }
    }

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
    }

    /**
     * Clear all entries
     */
    function clearAll() {
        if (entries.length > 0 && confirm('Are you sure you want to clear all entries?')) {
            entries = [];
        }
    }
</script>

<div class="initiative-tracker">
    <h3>Initiative Tracker</h3>
    
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
        {#if entries.length > 0}
            <button onclick={clearAll} class="clear-btn">Clear All</button>
        {/if}
    </div>



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
</div>

<style>
    .initiative-tracker {
        max-width: 600px;
        margin: 0 auto;
    }

    .initiative-tracker h3 {
        margin: 0 0 1.5rem 0;
        text-align: center;
        color: #333;
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
    }
</style>