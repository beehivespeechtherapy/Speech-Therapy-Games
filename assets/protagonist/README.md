# Protagonist Characters

The protagonist is the character that moves along the map as students complete challenges.

## Current Character: Ninja

The default character is a ninja with:
- Black outfit with red belt/headband
- Three states: idle, walking, celebrating
- SVG format for crisp scaling

## Creating Custom Characters

Each game can have its own protagonist! Create three SVG files:

### Required Files
- `idle.png` - Standing still at checkpoints
- `walking.png` - Moving along the path
- `celebrating.png` - Victory dance when game is won

### Dimensions
- Size: 100x100px SVG canvas
- Character should be centered
- Leave some padding at edges

### Character Ideas

**Pirate Theme:**
- Idle: Standing with hands on hips
- Walking: Swinging arms, peg leg
- Celebrating: Waving sword, treasure chest

**Parrot Theme:**
- Idle: Perched, wings folded
- Walking: Wings slightly out for balance
- Celebrating: Wings spread wide, colorful feathers

**Robot Theme:**
- Idle: Straight stance, antenna up
- Walking: Mechanical stride
- Celebrating: Lights flashing, arms up

**Astronaut Theme:**
- Idle: Floating stance
- Walking: Moon bounce walk
- Celebrating: Floating with stars

**Dragon Theme:**
- Idle: Sitting, tail curled
- Walking: Four-legged stride
- Celebrating: Wings spread, breathing sparkles

## Using Custom Characters

In your game's config.json:

```json
{
  "protagonist": {
    "name": "Captain Sparrow",
    "images": {
      "idle": "assets/protagonist/pirate-idle.png",
      "walking": "assets/protagonist/pirate-walking.png",
      "celebrating": "assets/protagonist/pirate-celebrating.png"
    }
  }
}
```

If not specified, uses the default ninja character from `../../assets/protagonist/`.

## Tips

- Keep designs simple and recognizable
- Use bold colors that stand out on backgrounds
- Make sure character is visible at small sizes
- Test on actual map to ensure good contrast
- SVG format recommended for crisp rendering
