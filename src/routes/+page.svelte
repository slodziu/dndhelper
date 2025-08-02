<script>
  import { invoke } from "@tauri-apps/api/core";
  import DiceRoller from "$lib/DiceRoller.svelte";
  import MainMenu from "$lib/MainMenu.svelte";
  import Modal from "$lib/Modal.svelte";
  import InitiativeTracker from "$lib/InitiativeTracker.svelte";
  import CharacterSheet from "$lib/CharacterSheet.svelte";
  let name = $state("");
  let greetMsg = $state("");
  let activeModal = $state("");
  let isModalOpen = $state(false);

  /**
   * Handle form submission
   * @param {Event} event - The form submit event
   */
  async function greet(event) {
    event.preventDefault();
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    greetMsg = await invoke("greet", { name });
  }

  /**
   * Handle tile click from main menu
   * @param {CustomEvent} event
   */
  function handleTileClick(event) {
    const { tileId } = event.detail;
    activeModal = tileId;
    isModalOpen = true;
  }

  /**
   * Close the modal
   */
  function closeModal() {
    isModalOpen = false;
    activeModal = "";
  }

  /**
   * Get modal title based on active modal
   * @param {string} modalId
   * @returns {string}
   */
  function getModalTitle(modalId) {
    /** @type {Record<string, string>} */
    const titles = {
      'dice-roller': 'Dice Roller',
      'character-sheet': 'Character Manager',
      'spell-book': 'Spell Book',
      'initiative-tracker': 'Initiative Tracker',
      'monster-manual': 'Monster Manual',
      'campaign-notes': 'Campaign Notes'
    };
    return titles[modalId] || '';
  }
</script>

<main class="container">
  <h1>Welcome to D&D Helper</h1>
  
  <!-- Main Menu with Tiles -->
  <MainMenu on:tileClick={handleTileClick} />
</main>

<!-- Modal for different tools -->
<Modal 
  bind:isOpen={isModalOpen} 
  title={getModalTitle(activeModal)}
  on:close={closeModal}
>
  {#if activeModal === 'dice-roller'}
    <DiceRoller />
  {:else if activeModal === 'character-sheet'}
    <CharacterSheet />
  {:else if activeModal === 'spell-book'}
    <div class="coming-soon">
      <h3>Spell Book</h3>
      <p>This feature is coming soon! Browse spells, manage spell slots, and track your magical abilities.</p>
    </div>
  {:else if activeModal === 'initiative-tracker'}
    <InitiativeTracker />
  {:else if activeModal === 'monster-manual'}
    <div class="coming-soon">
      <h3>Monster Manual</h3>
      <p>This feature is coming soon! Look up monster stats, abilities, and encounter information.</p>
    </div>
  {:else if activeModal === 'campaign-notes'}
    <div class="coming-soon">
      <h3>Campaign Notes</h3>
      <p>This feature is coming soon! Keep track of your adventure, NPCs, locations, and story progress.</p>
    </div>
  {/if}
</Modal>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding: 2rem 1rem;
  min-height: 100vh;
}

h1 {
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.5rem;
  color: #333;
  font-weight: 600;
}

.coming-soon {
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
}

.coming-soon h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #333;
}

.coming-soon p {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  h1 {
    color: #f6f6f6;
  }

  .coming-soon {
    color: #ccc;
  }

  .coming-soon h3 {
    color: #f6f6f6;
  }
}

</style>
