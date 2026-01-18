// Additional UI enhancements
class UIEnhancer {
    constructor() {
        this.initTooltips();
        this.initColorPicker();
        this.initResponsiveDesign();
    }
    
    initTooltips() {
        // Add tooltips to all buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            const title = button.getAttribute('title');
            if (title) {
                button.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, title);
                });
                button.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            }
        });
    }
    
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.position = 'fixed';
        tooltip.style.background = '#333';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '10000';
        tooltip.style.pointerEvents = 'none';
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
        
        element.tooltip = tooltip;
    }
    
    hideTooltip() {
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }
    
    initColorPicker() {
        const colorPicker = document.getElementById('custom-color-picker');
        const colorOptions = document.querySelectorAll('.color-option');
        
        // Update color picker when color option is clicked
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorPicker.value = option.dataset.color;
            });
        });
        
        // Update active color when picker changes
        colorPicker.addEventListener('input', () => {
            const color = colorPicker.value;
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Find matching color option
            const matchingOption = Array.from(colorOptions).find(
                opt => opt.dataset.color === color
            );
            
            if (matchingOption) {
                matchingOption.classList.add('active');
            }
        });
    }
    
    initResponsiveDesign() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
        
        this.updateLayout();
    }
    
    updateLayout() {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.querySelector('.sidebar');
        const canvasContainer = document.querySelector('.canvas-container');
        
        if (isMobile) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }
}

// Initialize UI enhancements
document.addEventListener('DOMContentLoaded', () => {
    window.uiEnhancer = new UIEnhancer();
});