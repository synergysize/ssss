// tooltipHandler.js - Handle wallet tooltips
export class TooltipHandler {
  constructor() {
    this.tooltip = document.getElementById('wallet-tooltip');
    this.titleElement = this.tooltip.querySelector('.tooltip-title');
    this.addressElement = this.tooltip.querySelector('.tooltip-address');
    this.fartcoinElement = this.tooltip.querySelector('.tooltip-fartcoin');
    this.goatElement = this.tooltip.querySelector('.tooltip-goat');
    this.totalElement = this.tooltip.querySelector('.tooltip-total');
    
    // Initialize mouse position tracking
    this.mouse = { x: 0, y: 0 };
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
      
      // Update tooltip position if it's visible
      if (this.tooltip.style.display === 'block') {
        this.updatePosition();
      }
    });
  }
  
  // Show tooltip with wallet data
  showTooltip(wallet) {
    // Set wallet data in tooltip
    this.titleElement.textContent = wallet.type === 'fartcoin' ? 'Fartcoin Wallet' : 'Goattoken Wallet';
    this.addressElement.textContent = wallet.Account || 'Unknown Address';
    
    // Set holdings
    const fartcoinAmount = wallet.type === 'fartcoin' ? wallet.Quantity || '0' : '0';
    const goatAmount = wallet.type === 'goattoken' ? wallet.Quantity || '0' : '0';
    
    this.fartcoinElement.textContent = `💨: ${fartcoinAmount}`;
    this.goatElement.textContent = `🐐: ${goatAmount}`;
    
    // Calculate total value (simplified)
    const totalValue = wallet.type === 'fartcoin' ? fartcoinAmount : goatAmount;
    this.totalElement.textContent = `Total Value: ${totalValue}`;
    
    // Show tooltip
    this.tooltip.style.display = 'block';
    this.updatePosition();
  }
  
  // Hide tooltip
  hideTooltip() {
    this.tooltip.style.display = 'none';
  }
  
  // Update tooltip position based on mouse coordinates
  updatePosition() {
    const margin = 15; // Margin from cursor
    
    // Calculate tooltip dimensions
    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;
    
    // Calculate tooltip position
    let left = this.mouse.x + margin;
    let top = this.mouse.y + margin;
    
    // Adjust position if tooltip would go off screen
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (left + tooltipWidth > windowWidth) {
      left = this.mouse.x - tooltipWidth - margin;
    }
    
    if (top + tooltipHeight > windowHeight) {
      top = this.mouse.y - tooltipHeight - margin;
    }
    
    // Set tooltip position
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }
}