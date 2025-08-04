<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  /**
   * Handle tile click
   * @param {string} tileId - The ID of the clicked tile
   */
  function handleTileClick(tileId) {
    dispatch('tileClick', { tileId });
  }
  
  const tiles = [
    {
      id: 'dice-roller',
      title: 'Dice Roller',
      description: 'Roll dice with custom notation',
      icon: '🎲',
      color: '#4CAF50'
    },
    {
      id: 'character-sheet',
      title: 'Character Sheets',
      description: 'Manage your character stats',
      icon: '📋',
      color: '#2196F3'
    },
    {
      id: 'initiative-tracker',
      title: 'Initiative Tracker',
      description: 'Track combat initiative',
      icon: '⚔️',
      color: '#FF5722'
    },
    {
      id: 'monster-manual',
      title: 'Monster Manual',
      description: 'Look up monster stats',
      icon: '👹',
      color: '#607D8B'
    },
    {
      id: 'campaign-notes',
      title: 'Campaign Notes',
      description: 'Keep track of your adventure',
      icon: '📝',
      color: '#795548',
      comingSoon: true
    }
  ];
</script>

<div class="main-menu">
  <h2>D&D Helper Tools</h2>
  <div class="tiles-grid">
    {#each tiles as tile}
      <div 
        class="tile {tile.comingSoon ? 'coming-soon' : ''}"
        style="--tile-color: {tile.color}"
        onclick={() => !tile.comingSoon && handleTileClick(tile.id)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !tile.comingSoon && handleTileClick(tile.id)}
        tabindex="0"
        role="button"
        aria-label="{tile.title} - {tile.description}"
      >
        <div class="tile-icon">{tile.icon}</div>
        <h3 class="tile-title">{tile.title}</h3>
        <p class="tile-description">{tile.description}</p>
        {#if tile.comingSoon}
          <div class="coming-soon-badge">Coming Soon</div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .main-menu {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .main-menu h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
    font-size: 2rem;
  }

  .tiles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    justify-content: center;
  }

  .tile {
    position: relative;
    background: linear-gradient(135deg, var(--tile-color), rgba(var(--tile-color), 0.8));
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    color: white;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

  .tile:not(.coming-soon):hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .tile:not(.coming-soon):active {
    transform: translateY(-4px);
  }

  .tile.coming-soon {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(0.3);
  }

  .tile-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .tile-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .tile-description {
    font-size: 1rem;
    margin: 0;
    opacity: 0.9;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .coming-soon-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .tile:focus {
    outline: 3px solid #fff;
    outline-offset: 4px;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .main-menu h2 {
      color: #f6f6f6;
    }

    .tile {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tile:not(.coming-soon):hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .main-menu {
      padding: 1rem;
    }

    .tiles-grid {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .tile {
      padding: 1.5rem;
      min-height: 180px;
    }

    .tile-icon {
      font-size: 2.5rem;
    }

    .tile-title {
      font-size: 1.3rem;
    }
  }
</style>
