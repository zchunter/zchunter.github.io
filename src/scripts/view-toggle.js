// View toggle functionality for SmartAudit
document.addEventListener('DOMContentLoaded', () => {
    // Variables
    let currentViewMode = 'byLesson'; // 'byLesson' or 'byCheck'
    let currentResults = null;
    
    // Initialize toggle buttons
    function initViewToggle() {
        const byLessonBtn = document.getElementById('viewByLesson');
        const byCheckBtn = document.getElementById('viewByCheck');
        
        if (byLessonBtn && byCheckBtn) {
            byLessonBtn.addEventListener('click', () => {
                if (currentViewMode !== 'byLesson') {
                    currentViewMode = 'byLesson';
                    byLessonBtn.classList.add('active');
                    byCheckBtn.classList.remove('active');
                    if (currentResults) updateResultsView();
                }
            });
            
            byCheckBtn.addEventListener('click', () => {
                if (currentViewMode !== 'byCheck') {
                    currentViewMode = 'byCheck';
                    byCheckBtn.classList.add('active');
                    byLessonBtn.classList.remove('active');
                    if (currentResults) updateResultsView();
                }
            });
        }
    }
    
    // Update the view based on current mode
    function updateResultsView() {
        const container = document.getElementById('results-view-container');
        if (!container || !currentResults) return;
        
        if (currentViewMode === 'byLesson') {
            container.innerHTML = generateLessonView(currentResults);
        } else {
            container.innerHTML = generateCheckTypeView(currentResults);
        }
        
        initAccordions();
    }
    
    // Initialize accordions
    function initAccordions() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.closest('.accordion-item');
                if (item) item.classList.toggle('accordion-collapsed');
            });
        });
    }
    
    // Set current results and update view
    function setResults(results) {
        currentResults = results;
        updateResultsView();
    }
    
    // Expose functions to global scope
    window.viewToggle = {
        init: initViewToggle,
        setResults: setResults
    };
});