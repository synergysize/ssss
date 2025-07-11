# Interactive Node Functionality Implementation

## Overview
Added interactive node functionality to the wallet visualization with sound effects, proximity detection, and Solscan integration.

## Features Implemented

### Sound Effects
- Sound files located in `/public/sound/` directory
- Added preloading of all sound files on application start
- Implemented random sound selection based on wallet type:
  - Fartcoin wallets play random `fart-00X.mp3` sounds (5 variants)
  - Goattoken wallets play random `bahhh-00X.mp3` sounds (5 variants)
- Added sound management to prevent overlap glitches

### Proximity + Look Detection
- Implemented proximity detection to determine when user is close to a wallet node
- Used dot product calculation to detect when user is looking directly at a node
- Created floating "Press E" prompt that appears only when conditions are met
- Ensured prompt doesn't overlap with wallet tooltips by positioning it appropriately
- Configured to only show one prompt at a time
- Excluded the center orb from interaction

### Interaction Flow
1. When user is close and looking at a node: "Press E" prompt appears
2. When E is pressed:
   - Play appropriate random sound effect based on wallet type
   - Show confirmation dialog with the format: "You are about to open a pop-up to https://solscan.io/account/[address]. Confirm? (Y/N)"
3. If Y is pressed: Open Solscan URL in new tab
4. If N is pressed or no action: Close dialog and do nothing

### Technical Implementation
- Used raycasting for accurate node detection
- Implemented keyboard event handling for E, Y, and N keys
- Created non-intrusive UI elements that don't break the render loop
- Added proper error handling for sound playback
- Made sure interaction works for both Fartcoin (purple) and Goattoken (orange) nodes

## Repository Updates
- Added sound files to `/public/sound/` directory
- Updated code in main.js to implement all required functionality
- Pushed changes to GitHub: https://github.com/synergysize/ssss
- Verified deployment on Vercel: https://ssss-rouge-chi.vercel.app/