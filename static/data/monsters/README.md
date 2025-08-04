# Monster Manual Data Format

This guide explains how to add custom monsters to your D&D Helper Monster Manual.

## 🐉 Quick Start

Simply drop JSON files into `/static/data/monsters/` and they'll be automatically detected!

## Monster JSON Format

```json
{
  "name": "Monster Name",
  "size": "Medium",
  "type": "humanoid",
  "subtype": "half-orc",
  "alignment": "chaotic neutral",
  "armor_class": 14,
  "armor_desc": "leather armor",
  "hit_points": 27,
  "hit_dice": "6d8+6",
  "speed": {
    "walk": 30,
    "fly": 60,
    "swim": 30,
    "climb": 20,
    "burrow": 10
  },
  "strength": 14,
  "dexterity": 12,
  "constitution": 12,
  "intelligence": 8,
  "wisdom": 11,
  "charisma": 10,
  "skills": {
    "Intimidation": "+2",
    "Stealth": "+4"
  },
  "senses": "darkvision 60 ft., passive Perception 10",
  "languages": "Common, Orc",
  "challenge_rating": "1/4",
  "experience_points": 50,
  "special_abilities": [
    {
      "name": "Special Ability Name",
      "desc": "Description of what this special ability does."
    }
  ],
  "actions": [
    {
      "name": "Attack Name",
      "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) damage."
    }
  ],
  "legendary_actions": [
    {
      "name": "Legendary Action",
      "desc": "Description of legendary action."
    }
  ],
  "notes": "Optional notes about the monster, adjustments, or usage tips."
}
```

## Required Fields

- **name**: Monster's name
- **size**: Tiny, Small, Medium, Large, Huge, Gargantuan
- **type**: humanoid, beast, dragon, undead, etc.
- **alignment**: lawful good, chaotic evil, etc.
- **armor_class**: AC number
- **hit_points**: HP number
- **strength, dexterity, constitution, intelligence, wisdom, charisma**: Ability scores (3-30)
- **challenge_rating**: CR as string ("1/4", "2", "10", etc.)

## Optional Fields

- **subtype**: Race/subtype in parentheses
- **armor_desc**: Description of armor type
- **hit_dice**: Hit dice formula
- **speed**: Object with walk, fly, swim, climb, burrow speeds
- **skills**: Object with skill bonuses
- **senses**: Sense descriptions
- **languages**: Known languages
- **experience_points**: XP value
- **special_abilities**: Array of special abilities
- **actions**: Array of actions
- **legendary_actions**: Array of legendary actions
- **notes**: Custom notes

## Examples Included

The system comes with three example monsters:

1. **Guz** - Adjusted half-orc for level 1 encounters
2. **Goblin Scout** - Standard low-level encounter
3. **Young Red Dragon** - Mid-level boss encounter

## API Integration

The Monster Manual also supports D&D 5e API lookups! Just enter a monster name from the official API and it will:

1. Try to find it in the D&D 5e API first
2. Format it automatically for display
3. Add it to your collection with an 🌐 **Official** badge

## Tips

- **File naming**: Use descriptive names like `goblin-scout.json`, `young-red-dragon.json`
- **Challenge Rating**: Use strings for fractions: "1/8", "1/4", "1/2"
- **Speed**: Include all movement types the creature has
- **Descriptions**: Be descriptive in action and ability descriptions
- **Notes**: Use the notes field for DM reminders or encounter adjustments

## Monster Stats Quick Reference

### Common Challenge Ratings for Level 1-5:
- **CR 0**: 0-10 XP (Rats, commoners)
- **CR 1/8**: 25 XP (Guards, bandits) 
- **CR 1/4**: 50 XP (Goblins, wolves)
- **CR 1/2**: 100 XP (Orcs, hobgoblins)
- **CR 1**: 200 XP (Dire wolves, bugbears)
- **CR 2**: 450 XP (Ogres, owlbears)
- **CR 3**: 700 XP (Displacer beasts, wights)
- **CR 4**: 1,100 XP (Flameskull, werewolf)
- **CR 5**: 1,800 XP (Gladiator, troll)

### Ability Score Guidelines:
- **3-4**: Severely disabled
- **8-9**: Below average
- **10-11**: Average
- **12-13**: Above average
- **14-15**: Talented
- **16-17**: Gifted
- **18-19**: Exceptional
- **20-21**: Legendary
- **22+**: Godlike
