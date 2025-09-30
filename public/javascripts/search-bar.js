// Modern search bar interactive behavior
document.addEventListener('DOMContentLoaded', function() {
    const searchFields = document.querySelectorAll('.modern-search-field');
    
    // Add click handlers to each field
    searchFields.forEach(field => {
        const input = field.querySelector('.modern-search-input');
        
        // Click on field focuses the input
        field.addEventListener('click', () => {
            if (input) {
                input.focus();
            }
        });
        
        // Prevent the field click when clicking directly on input
        if (input) {
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    });
    
    // Add subtle animation when typing
    const textInput = document.querySelector('#keyword');
    if (textInput) {
        textInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
    }
});
