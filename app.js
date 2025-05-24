// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    let projectJsonPromise, buildJsonPromise

    // Check for pre-injected data (for static generation)
    if (typeof window.__projectData !== 'undefined' && typeof window.__buildData !== 'undefined') {
        console.log('report.js: Using pre-injected data for static generation.')
        projectJsonPromise = Promise.resolve(window.__projectData)
        buildJsonPromise = Promise.resolve(window.__buildData)
    } else {
        // Fallback to fetching if not pre-injected (for normal browser execution)
        console.log('report.js: Fetching data dynamically.')
        projectJsonPromise = fetch("project.json").then(response => {
            if (!response.ok) return Promise.reject(`Failed to load project.json: ${response.statusText}`)
            return response.json()
        })
        buildJsonPromise = fetch("build.json").then(response => {
            if (!response.ok) return Promise.reject(`Failed to load build.json: ${response.statusText}`)
            return response.json()
        })
    }

    Promise.all([projectJsonPromise, buildJsonPromise]).then(([projectDataFull, buildDataFull]) => {
        // Keep data sources separate and render the report
        renderReport(projectDataFull.project, buildDataFull.build)

        // Signal completion to the static generator, if the callback exists
        if (typeof window.reportGenerationComplete === 'function') {
            window.reportGenerationComplete()
        }
    })
    .catch(error => {
        console.error("Error loading report data:", error)

        // Signal error to the static generator, if the callback exists
        if (typeof window.reportGenerationError === 'function') {
            window.reportGenerationError(error);
        }
    })
})
