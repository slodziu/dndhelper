<script>
  let result = 0;
  let diceInput = '';
  let detailedResult = '';
  
  /**
   * Roll a dice with specified number of sides
   * @param {number} sides - Number of sides on the dice
   */
  function rollDice(sides) {
    // Validate input
    if (!sides || sides < 1) {
      console.error('Invalid number of sides:', sides);
      return;
    }
    
    // Generate random number between 1 and sides (inclusive)
    result = Math.floor(Math.random() * sides) + 1;
    detailedResult = `Rolled d${sides}: ${result}`;
    console.log(`Rolled a d${sides}: ${result}`);
  }

  /**
   * Parse and roll dice from input string like '1d4+2d8+5'
   */
  function rollFromInput() {
    if (!diceInput.trim()) {
      detailedResult = 'Please enter dice notation (e.g., 1d4+2d8+5)';
      result = 0;
      return;
    }

    try {
      // Remove spaces and convert to lowercase
      const cleanInput = diceInput.replace(/\s/g, '').toLowerCase();
      
      // Split by + and - while keeping the operators
      const terms = cleanInput.split(/([+-])/).filter(term => term !== '');
      
      let total = 0;
      let breakdown = [];
      let currentSign = 1; // 1 for positive, -1 for negative
      
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        
        if (term === '+') {
          currentSign = 1;
          continue;
        } else if (term === '-') {
          currentSign = -1;
          continue;
        }
        
        // Check if it's a dice roll (contains 'd')
        if (term.includes('d')) {
          const [numDice, sides] = term.split('d').map(n => parseInt(n) || 1);
          
          if (sides < 1) {
            throw new Error(`Invalid dice: d${sides}`);
          }
          
          let diceTotal = 0;
          let rolls = [];
          
          for (let j = 0; j < numDice; j++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            diceTotal += roll;
          }
          
          const termTotal = diceTotal * currentSign;
          total += termTotal;
          
          /** @type {string} */
          const sign = currentSign === 1 && breakdown.length > 0 ? '+' : (currentSign === -1 ? '-' : '');
          breakdown.push(`${sign}${numDice}d${sides}[${rolls.join(',')}]=${Math.abs(termTotal)}`);
          
        } else {
          // It's a modifier number
          const modifier = parseInt(term);
          if (isNaN(modifier)) {
            throw new Error(`Invalid number: ${term}`);
          }
          
          const termTotal = modifier * currentSign;
          total += termTotal;
          
          /** @type {string} */
          const sign = currentSign === 1 && breakdown.length > 0 ? '+' : (currentSign === -1 ? '-' : '');
          breakdown.push(`${sign}${Math.abs(modifier)}`);
        }
        
        // Reset sign for next term (default positive)
        currentSign = 1;
      }
      
      result = total;
      detailedResult = `${diceInput} = ${breakdown.join(' ')} = ${total}`;
      console.log(detailedResult);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      detailedResult = `Error: ${errorMessage}`;
      result = 0;
      console.error('Dice parsing error:', error);
    }
  }

  /**
   * Handle Enter key press in input field
   * @param {KeyboardEvent} event
   */
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      rollFromInput();
    }
  }
</script>

<div class="dice-roller">
  <!-- Dice Input Section -->
  <div class="dice-input-section">
    <h3>Custom Dice Roll</h3>
    <div class="input-group">
      <input 
        type="text" 
        bind:value={diceInput} 
        placeholder="e.g., 1d4+2d8+5" 
        onkeypress={handleKeyPress}
        class="dice-input"
      />
      <button onclick={rollFromInput} class="roll-button">Roll</button>
    </div>
  </div>

  <!-- Quick Dice Buttons -->
  <div class="quick-dice-section">
    <h3>Quick Dice</h3>
    <div class="dice-buttons">
      <button onclick={() => rollDice(4)}>Roll d4</button>
      <button onclick={() => rollDice(6)}>Roll d6</button>
      <button onclick={() => rollDice(8)}>Roll d8</button>
      <button onclick={() => rollDice(10)}>Roll d10</button>
      <button onclick={() => rollDice(12)}>Roll d12</button>
      <button onclick={() => rollDice(20)}>Roll d20</button>
    </div>
  </div>

  <!-- Results Section -->
  <div class="results-section">
    <div class="result-display">
      <span class="result-label">Result:</span>
      <span class="result-value">{result}</span>
    </div>
    {#if detailedResult}
      <p class="detailed-result">{detailedResult}</p>
    {/if}
  </div>
</div>

<style>
  .dice-roller {
    max-width: 600px;
    margin: 0 auto;
  }

  .dice-input-section, .quick-dice-section, .results-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #f9f9f9;
  }

  .dice-input-section h3, .quick-dice-section h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .dice-input {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .roll-button {
    padding: 0.6rem 1.2rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
  }

  .roll-button:hover {
    background-color: #45a049;
  }


  .dice-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .dice-buttons button {
    padding: 0.5rem 1rem;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .dice-buttons button:hover {
    background-color: #1976D2;
  }

  .results-section {
    text-align: center;
    background-color: #e8f5e8;
    border-color: #4CAF50;
  }

  .result-display {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .result-label {
    color: #333;
    font-weight: 500;
  }

  .result-value {
    color: #4CAF50;
    font-weight: bold;
    font-size: 2rem;
    margin-left: 0.5rem;
  }

  .detailed-result {
    font-size: 1rem;
    color: #555;
    margin: 0;
    word-break: break-all;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .dice-input-section, .quick-dice-section, .results-section {
      background-color: #2f2f2f;
      border-color: #555;
    }

    .dice-input-section h3, .quick-dice-section h3 {
      color: #f6f6f6;
    }

    .dice-input {
      background-color: #404040;
      border-color: #666;
      color: #f6f6f6;
    }


    .results-section {
      background-color: #1a4a1a;
      border-color: #4CAF50;
    }

    .result-label {
      color: #f6f6f6;
    }

    .detailed-result {
      color: #ccc;
    }
  }
</style>
