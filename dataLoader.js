// dataLoader.js - Load wallet data from CSV files
export async function loadWalletData() {
  try {
    // Load Fartcoin data
    const fartcoinResponse = await fetch('/fartcoin.csv');
    const fartcoinText = await fartcoinResponse.text();
    const fartcoinData = parseCSV(fartcoinText);
    
    // Load Goattoken data
    const goattokenResponse = await fetch('/goattoken.csv');
    const goattokenText = await goattokenResponse.text();
    const goattokenData = parseCSV(goattokenText);
    
    console.log(`Loaded ${fartcoinData.length} Fartcoin wallets and ${goattokenData.length} Goattoken wallets`);
    
    // Add type property to each wallet
    fartcoinData.forEach(wallet => {
      wallet.type = 'fartcoin';
      wallet.color = 'purple'; // Purple for Fartcoin
    });
    
    goattokenData.forEach(wallet => {
      wallet.type = 'goattoken';
      wallet.color = 'orange'; // Orange for Goattoken
    });
    
    return [...fartcoinData, ...goattokenData];
  } catch (error) {
    console.error('Error loading wallet data:', error);
    throw error;
  }
}

// Helper function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const wallet = {};
    
    headers.forEach((header, index) => {
      wallet[header] = values[index] || '';
    });
    
    return wallet;
  });
}