// walletData.js - Handles loading and parsing wallet data from CSV files

class WalletDataManager {
    constructor() {
        this.fartcoinWallets = [];
        this.goattokenWallets = [];
        this.isDataLoaded = false;
        this.onDataLoadedCallbacks = [];
    }

    // Load both CSV files and process them
    loadData() {
        Promise.all([
            this.fetchCSV('/fartcoin.csv'),
            this.fetchCSV('/goattoken.csv')
        ]).then(([fartcoinData, goattokenData]) => {
            // Process fartcoin data (get first 1000 wallets)
            this.fartcoinWallets = this.parseCSV(fartcoinData, 'fartcoin', 1000);
            
            // Process goattoken data (get first 1000 wallets)
            this.goattokenWallets = this.parseCSV(goattokenData, 'goattoken', 1000);
            
            console.log(`Loaded ${this.fartcoinWallets.length} Fartcoin wallets`);
            console.log(`Loaded ${this.goattokenWallets.length} Goattoken wallets`);
            
            // Mark data as loaded and call callbacks
            this.isDataLoaded = true;
            this.onDataLoadedCallbacks.forEach(callback => callback());
        }).catch(error => {
            console.error('Error loading wallet data:', error);
        });
    }

    // Fetch CSV file content
    async fetchCSV(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error fetching ${filePath}:`, error);
            throw error;
        }
    }

    // Parse CSV data and extract wallet addresses
    parseCSV(csvText, type, limit) {
        const lines = csvText.split('\\n');
        const headers = lines[0].split(',');
        const wallets = [];
        
        // Find the index of the "Account" column (wallet address)
        const addressIndex = headers.findIndex(h => h.trim().toLowerCase() === 'account');
        const quantityIndex = headers.findIndex(h => h.trim().toLowerCase().includes('quantity'));
        
        if (addressIndex === -1) {
            console.error(`No 'Account' column found in ${type} data`);
            return [];
        }
        
        // Skip header row, process data rows
        for (let i = 1; i < lines.length && wallets.length < limit; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length <= addressIndex) continue;
            
            const address = values[addressIndex].trim();
            let quantity = 0;
            
            if (quantityIndex !== -1 && values[quantityIndex]) {
                quantity = parseFloat(values[quantityIndex].replace(/[^0-9.]/g, '')) || 0;
            }
            
            if (address) {
                wallets.push({
                    address,
                    type,
                    quantity
                });
            }
        }
        
        return wallets.slice(0, limit);
    }

    // Register callback for when data is loaded
    onDataLoaded(callback) {
        if (this.isDataLoaded) {
            callback();
        } else {
            this.onDataLoadedCallbacks.push(callback);
        }
    }

    // Get all wallet data as a combined array
    getAllWallets() {
        return [...this.fartcoinWallets, ...this.goattokenWallets];
    }
}

// Create a global instance
const walletDataManager = new WalletDataManager();