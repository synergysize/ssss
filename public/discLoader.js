/**
 * discLoader.js - Load wallet data for the spiral disc visualization
 * 
 * This module loads the first 1000 wallets from fartcoin.csv and goattoken.csv,
 * combines them into one list, and prepares them for visualization in a flat spiral disc.
 */

import dataLoader from './dataLoader.js';
const { initializeData, fartcoinHolders, goatTokenHolders } = dataLoader;

// Define colors for the disc nodes
const FARTCOIN_COLOR = 'rgb(0, 0, 255)'; // Blue
const GOATTOKEN_COLOR = 'rgb(0, 255, 0)'; // Green
const SHARED_COLOR = 'rgb(255, 255, 255)'; // White for wallets in both lists

// Constants for spiral generation
const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);
const BASE_RADIUS = 1000; // Reduced radius to make sure nodes are visible
const SPREAD = 35; // Controls how quickly the spiral expands
const Y_JITTER = 2; // Random Y position between -2 and +2

// Load first 1000 wallets from each token
export function loadDiscWallets() {
  console.log('Loading wallet data for spiral disc visualization...');
  
  // Ensure data is initialized
  initializeData();
  console.log(`DATA CHECK: Fartcoin holders: ${fartcoinHolders.length}, Goat token holders: ${goatTokenHolders.length}`);
  
  // Take first 1000 wallets from each list
  const fartcoinWallets = fartcoinHolders.slice(0, 1000).map(wallet => ({
    address: wallet.address,
    amount: wallet.amount,
    type: 'fartcoin',
    color: FARTCOIN_COLOR,
    fartAmount: wallet.amount,
    goatAmount: 0
  }));
  
  const goatWallets = goatTokenHolders.slice(0, 1000).map(wallet => ({
    address: wallet.address,
    amount: wallet.amount,
    type: 'goat',
    color: GOATTOKEN_COLOR,
    fartAmount: 0,
    goatAmount: wallet.amount
  }));
  
  console.log(`Loaded ${fartcoinWallets.length} fartcoin wallets and ${goatWallets.length} goat wallets for disc`);
  
  // Create a map of all addresses to check for duplicates
  const addressMap = new Map();
  
  // Process all wallets to identify shared ones
  const processedWallets = [];
  
  // Process Fartcoin wallets first
  fartcoinWallets.forEach(wallet => {
    addressMap.set(wallet.address, {
      fartAmount: wallet.amount,
      index: processedWallets.length
    });
    processedWallets.push(wallet);
  });
  
  // Process Goat wallets and check for duplicates
  goatWallets.forEach(wallet => {
    if (addressMap.has(wallet.address)) {
      // This is a shared wallet - update the existing entry
      const existingData = addressMap.get(wallet.address);
      const existingWallet = processedWallets[existingData.index];
      
      // Update to mark as shared
      existingWallet.type = 'shared';
      existingWallet.color = SHARED_COLOR;
      existingWallet.goatAmount = wallet.amount;
      
      // Recalculate total amount
      existingWallet.amount = existingWallet.fartAmount + wallet.amount;
    } else {
      // Add new goat wallet
      addressMap.set(wallet.address, {
        goatAmount: wallet.amount,
        index: processedWallets.length
      });
      processedWallets.push(wallet);
    }
  });
  
  console.log(`Generated combined disc data with ${processedWallets.length} total wallets`);
  
  // Log some wallet examples for debugging
  if (processedWallets.length > 0) {
    console.log(`Sample wallet from processed list:`, processedWallets[0]);
  } else {
    console.error(`ERROR: No wallets were processed for disc visualization!`);
  }

  // Return the combined list
  return processedWallets;
}

// Position wallets in a flat spiral pattern
export function createSpiralLayout(wallets) {
  console.log('Creating spiral layout for disc wallets...');
  
  return wallets.map((wallet, i) => {
    // Calculate spiral position
    const angle = i * GOLDEN_ANGLE;
    const radius = BASE_RADIUS + SPREAD * Math.sqrt(i);
    
    // Flat spiral with slight y-jitter
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = (Math.random() * Y_JITTER * 2) - Y_JITTER; // Random between -2 and +2
    
    // Create the final wallet data object
    return {
      ...wallet,
      x, y, z,
      walletType: wallet.type,
      totalHolding: wallet.amount
    };
  });
}

// Get spiral disc data
export function getDiscData() {
  const wallets = loadDiscWallets();
  return createSpiralLayout(wallets);
}

// Export default for convenience
export default {
  getDiscData
};