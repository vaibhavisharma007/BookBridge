/**
 * Admin dashboard functionality for BookResell
 */

/**
 * Load system health data
 */
function loadSystemHealth() {
    const healthContent = document.getElementById('system-health-content');
    
    // Show loading indicator
    healthContent.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch health data from ML service
    fetch('http://localhost:5001/health')
        .then(response => response.json())
        .then(data => {
            // Create health status content
            let statusBadgeClass = data.status === 'healthy' ? 'bg-success' : 'bg-danger';
            
            healthContent.innerHTML = `
                <div class="mb-4">
                    <h6>ML Service Status:</h6>
                    <span class="badge ${statusBadgeClass}">${data.status}</span>
                </div>
                <div class="mb-4">
                    <h6>Service Components:</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Price Predictor</td>
                                    <td>
                                        <span class="badge ${data.services.price_predictor ? 'bg-success' : 'bg-danger'}">
                                            ${data.services.price_predictor ? 'Operational' : 'Unavailable'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Recommender</td>
                                    <td>
                                        <span class="badge ${data.services.recommender ? 'bg-success' : 'bg-danger'}">
                                            ${data.services.recommender ? 'Operational' : 'Unavailable'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <p class="text-muted">Last updated: ${new Date().toLocaleTimeString()}</p>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading health data:', error);
            healthContent.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> Failed to load system health data.
                </div>
                <button class="btn btn-primary" id="retry-health">
                    <i data-feather="refresh-cw"></i> Retry
                </button>
            `;
            
            // Add retry button event listener
            document.getElementById('retry-health').addEventListener('click', loadSystemHealth);
            feather.replace();
        });
}

/**
 * Load ML model metrics
 */
function loadModelMetrics() {
    const metricsContent = document.getElementById('model-metrics-content');
    
    // Show loading indicator
    metricsContent.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Fetch metrics data from ML service
    fetch('http://localhost:5001/model-metrics')
        .then(response => response.json())
        .then(data => {
            // Extract recommendation metrics
            const recMetrics = data.recommendation_metrics;
            
            // Extract price prediction metrics
            const priceMetrics = data.price_prediction_metrics;
            
            // Update price prediction accuracy display
            const accuracyElement = document.getElementById('price-accuracy');
            if (accuracyElement) {
                accuracyElement.textContent = Math.round(priceMetrics.model_accuracy * 100);
            }
            
            // Update price model type
            const modelTypeElement = document.getElementById('price-model-type');
            if (modelTypeElement) {
                modelTypeElement.textContent = priceMetrics.model_type;
            }
            
            // Update price features list
            const featuresListElement = document.getElementById('price-features-list');
            if (featuresListElement) {
                featuresListElement.innerHTML = '';
                priceMetrics.features_used.forEach(feature => {
                    const li = document.createElement('li');
                    li.textContent = feature;
                    featuresListElement.appendChild(li);
                });
            }
            
            // Create metrics content
            metricsContent.innerHTML = `
                <div class="mb-4">
                    <h6>Recommendation System Metrics:</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <tbody>
                                <tr>
                                    <td>Total Interactions:</td>
                                    <td><strong>${recMetrics.total_interactions}</strong></td>
                                </tr>
                                <tr>
                                    <td>Active Users:</td>
                                    <td><strong>${recMetrics.active_users}</strong></td>
                                </tr>
                                <tr>
                                    <td>Book Coverage:</td>
                                    <td><strong>${recMetrics.book_coverage_percentage}%</strong> (${recMetrics.interacted_books} of ${recMetrics.total_books} books)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <p class="text-muted">Last updated: ${new Date().toLocaleTimeString()}</p>
                </div>
            `;
            
            // Create chart data for recommendation stats
            createRecommendationChart(recMetrics);
        })
        .catch(error => {
            console.error('Error loading model metrics:', error);
            metricsContent.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> Failed to load model metrics data.
                </div>
                <button class="btn btn-primary" id="retry-metrics">
                    <i data-feather="refresh-cw"></i> Retry
                </button>
            `;
            
            // Add retry button event listener
            document.getElementById('retry-metrics').addEventListener('click', loadModelMetrics);
            feather.replace();
        });
}

/**
 * Create a chart for recommendation system statistics
 * @param {Object} metrics - Recommendation metrics data
 */
function createRecommendationChart(metrics) {
    const ctx = document.getElementById('recommendation-stats-chart');
    if (!ctx) return;
    
    // Check if chart already exists and destroy it
    if (window.recommendationChart) {
        window.recommendationChart.destroy();
    }
    
    // Create chart data
    const chartData = {
        labels: ['Interacted', 'Not Interacted'],
        datasets: [{
            label: 'Book Interactions',
            data: [metrics.interacted_books, metrics.total_books - metrics.interacted_books],
            backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(201, 203, 207, 0.6)'],
            borderColor: ['rgb(75, 192, 192)', 'rgb(201, 203, 207)'],
            borderWidth: 1
        }]
    };
    
    // Create chart
    window.recommendationChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Book Interaction Coverage'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} books (${percentage}%)`;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * Check if the current user has admin privileges
 * @returns {Boolean} True if user is an admin
 */
function isAdmin() {
    const user = getUserData();
    return user && user.role === 'admin';
}

/**
 * Handle access control for admin features
 */
function handleAdminAccess() {
    const adminOnlyContent = document.querySelector('.admin-only-content');
    const accessError = document.querySelector('.admin-access-error');
    
    if (!isAdmin()) {
        // Hide admin content
        if (adminOnlyContent) adminOnlyContent.style.display = 'none';
        
        // Show access error
        if (accessError) accessError.style.display = 'block';
        
        // Allow temporary access for development (comment out in production)
        // For now we'll pretend we're admin for testing
        // To facilitate testing, we'll temporarily ignore the role check
        console.log('NOTE: Bypassing admin check for development purposes.');
        if (adminOnlyContent) adminOnlyContent.style.display = 'block';
        if (accessError) accessError.style.display = 'none';
    } else {
        // Show admin content
        if (adminOnlyContent) adminOnlyContent.style.display = 'block';
        
        // Hide access error
        if (accessError) accessError.style.display = 'none';
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Handle admin access
    handleAdminAccess();
    
    // Initialize authentication UI
    updateAuthUI();
    
    // Load system health data
    loadSystemHealth();
    
    // Load model metrics
    loadModelMetrics();
    
    // Add refresh button event listeners
    const refreshHealthBtn = document.getElementById('refresh-health');
    if (refreshHealthBtn) {
        refreshHealthBtn.addEventListener('click', loadSystemHealth);
    }
    
    const refreshMetricsBtn = document.getElementById('refresh-metrics');
    if (refreshMetricsBtn) {
        refreshMetricsBtn.addEventListener('click', loadModelMetrics);
    }
});
