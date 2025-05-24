// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Dynamically add info-items based on conditions
    Promise.all([
        fetch("project.json").then(response => response.ok ? response.json() : Promise.reject("Failed to load project.json")),
        fetch("build.json").then(response => response.ok ? response.json() : Promise.reject("Failed to load build.json"))
    ])
    .then(([projectData, buildData]) => {
        // Keep data sources separate and render the report
        renderReport(projectData.project, buildData.build)
    })
    .catch(error => {
        console.error("Error loading report data:", error)
    })
})
