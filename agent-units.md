# Agent's Guide to Creating Units

This document provides a complete, step-by-step workflow for creating a new unit and fully integrating it into the game engine. Follow these steps to ensure consistency and prevent integration errors.

---

## Step 1: Create the Unit Data File (`.json`)

All unit stats are stored in external JSON files for easy tweaking and management.

1.  **Create the file**: Add a new JSON file in the appropriate faction directory, e.g., `assets/data/protoss/<unit_name>.json`.
2.  **Define stats**: Populate the file with the unit's core attributes.

**Example: `assets/data/terran/new_unit.json`**
```json
{
    "stats": {
        "health": 100,
        "shields": 0,
        "armor": 1,
        "speed": 3.5
    }
}

