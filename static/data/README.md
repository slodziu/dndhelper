# Custom D&D Data Guide

This guide explains how to add your own custom backgrounds, classes, races, and spells to your D&D Helper application.

## Directory Structure

Your custom data files should be placed in the following structure:

```
static/data/
├── index.json          # Index of all custom data
├── backgrounds/        # Custom backgrounds
│   ├── custom-scholar.json
│   └── tavern-keeper.json
├── classes/           # Custom classes
├── races/             # Custom races
└── spells/            # Custom spells
```

## How It Works

1. **Lookup Priority**: When you click a lookup button, the system will:
   - First try the official D&D 5e API
   - If not found, check your custom data files
   - Display the result with a source indicator (🌐 Official or 📝 Custom)

2. **Automatic Loading**: Custom data is automatically loaded when the app starts

## Adding Custom Backgrounds

### 1. Create a JSON file

Create a new file in `static/data/backgrounds/` with a descriptive filename (e.g., `my-custom-background.json`):

```json
{
  "name": "My Custom Background",
  "skillProficiencies": "Investigation, Perception",
  "languages": "Choose 1 language",
  "equipment": "Explorer's pack, thieves' tools, hooded lantern, 15 gp",
  "equipmentOptions": "Choose between rope (50 feet) or grappling hook",
  "features": [
    {
      "name": "Feature Name",
      "description": "Detailed description of what this feature does. You can include multiple paragraphs and specific mechanics here."
    }
  ]
}
```

### 2. Update the index

Add your new background to `static/data/index.json`:

```json
{
  "backgrounds": [
    {
      "name": "My Custom Background",
      "filename": "my-custom-background.json",
      "description": "Brief description of the background"
    }
  ],
  "classes": [],
  "races": [],
  "spells": []
}
```

## Adding Custom Classes

Create a file in `static/data/classes/`:

```json
{
  "name": "My Custom Class",
  "hitDie": 8,
  "primaryAbility": "Strength, Dexterity",
  "proficiencies": "Light armor, medium armor, shields, simple weapons",
  "proficiencyChoices": "Choose 2 skills from: Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival"
}
```

## Adding Custom Races

Create a file in `static/data/races/`:

```json
{
  "name": "My Custom Race",
  "size": "Medium",
  "speed": 30,
  "abilityBonuses": "Strength: +2, Constitution: +1",
  "languages": "Common, Orcish",
  "proficiencies": "Light armor, medium armor",
  "traits": "Darkvision: You can see in dim light within 60 feet of you as if it were bright light\nRelentless Endurance: When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead"
}
```

## Adding Custom Spells

Create a file in `static/data/spells/`:

```json
{
  "name": "My Custom Spell",
  "level": 1,
  "school": "Evocation",
  "castingTime": "1 action",
  "range": "60 feet",
  "components": "V, S",
  "duration": "Instantaneous",
  "description": "You create a magical effect that does something awesome. The spell affects targets within range.",
  "higherLevel": "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.",
  "classes": "Wizard, Sorcerer"
}
```

## File Naming Conventions

- Use lowercase letters
- Replace spaces with hyphens
- Remove special characters
- Example: "Custom Scholar" → `custom-scholar.json`

## Tips

1. **Backup**: Keep backups of your custom data files
2. **Testing**: Test your custom entries after adding them
3. **Validation**: Make sure your JSON is valid (use a JSON validator online)
4. **Updates**: Remember to update `index.json` when adding new files

## Example Files Included

The system comes with two example custom backgrounds:
- **Custom Scholar**: A research-focused background
- **Tavern Keeper**: A hospitality industry background

You can use these as templates for creating your own custom content.

## Troubleshooting

- **Not showing up**: Check that the filename in `index.json` matches your actual file
- **JSON errors**: Validate your JSON syntax
- **Name matching**: Make sure the name formatting is consistent (the system handles case and special characters automatically)
