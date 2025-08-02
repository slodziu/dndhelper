<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isOpen = false;
  export let title = '';
  
  /**
   * Close the modal
   */
  function closeModal() {
    dispatch('close');
  }
  
  /**
   * Handle backdrop click
   * @param {MouseEvent} event
   */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  /**
   * Handle escape key
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div 
    class="modal-backdrop" 
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button 
          class="close-button" 
          onclick={closeModal}
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 90vw;
    max-height: 90vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e0e0e0;
    background: #f8f9fa;
  }

  .modal-header h2 {
    margin: 0;
    color: #333;
    font-size: 1.5rem;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #333;
  }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .modal-content {
      background: #2f2f2f;
      color: #f6f6f6;
    }

    .modal-header {
      background: #404040;
      border-bottom-color: #555;
    }

    .modal-header h2 {
      color: #f6f6f6;
    }

    .close-button {
      color: #ccc;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f6f6f6;
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .modal-content {
      margin: 0;
      border-radius: 0;
      height: 100vh;
      max-height: 100vh;
      max-width: 100vw;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-body {
      padding: 1rem;
    }
  }
</style>
