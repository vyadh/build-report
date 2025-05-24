// This script converts the dynamic build report into a single static HTML file.

const fs = require('fs').promises; // Using promises API for async file operations
const path = require('path');
const { JSDOM } = require('jsdom');

const PROJECT_JSON_PATH = path.join(__dirname, 'project.json');
const BUILD_JSON_PATH = path.join(__dirname, 'build.json');
const HTML_TEMPLATE_PATH = path.join(__dirname, 'index.html');
const CSS_PATH = path.join(__dirname, 'styles.css');
const OUTPUT_HTML_PATH = path.join(__dirname, 'report.html');

async function generateStaticReport() {
    try {
        console.log('Starting static report generation...');

        // 1. Read all necessary file contents
        // These files' content will be used to construct the static page.
        const htmlTemplateContent = await fs.readFile(HTML_TEMPLATE_PATH, 'utf8');
        const cssContent = await fs.readFile(CSS_PATH, 'utf8');
        const projectJsonString = await fs.readFile(PROJECT_JSON_PATH, 'utf8');
        const buildJsonString = await fs.readFile(BUILD_JSON_PATH, 'utf8');

        // Parse JSON data. This data will be injected into the JSDOM environment.
        const projectData = JSON.parse(projectJsonString);
        const buildData = JSON.parse(buildJsonString);

        console.log('All source files read successfully.');

        // 2. Configure and create JSDOM instance
        // JSDOM will simulate a browser environment to run report.js.

        let resolveReportGeneration;
        let rejectReportGeneration;
        // This promise will resolve when report.js signals it has finished DOM manipulation.
        const reportGeneratedPromise = new Promise((resolve, reject) => {
            resolveReportGeneration = resolve;
            rejectReportGeneration = reject;
        });

        console.log('Creating JSDOM instance...');
        const dom = new JSDOM(htmlTemplateContent, {
            runScripts: "dangerously", // IMPORTANT: Allows <script src="report.js"> in index.html to execute.
            resources: "usable",      // IMPORTANT: Allows JSDOM to load local resources like report.js via its src.
            url: `file://${__dirname}/`, // Sets the base URL for the document, crucial for resolving relative paths like 'report.js' in <script src>.
            beforeParse(window) {
                // This code runs in the JSDOM context before parsing index.html.
                // We inject the JSON data and completion callbacks into the window object.
                // The modified report.js will look for these.
                console.log('JSDOM beforeParse: Injecting __projectData, __buildData, and callbacks...');
                window.__projectData = projectData; // Parsed content of project.json
                window.__buildData = buildData;     // Parsed content of build.json

                // Callback for report.js to signal successful completion.
                window.reportGenerationComplete = () => {
                    console.log('JSDOM: report.js signaled reportGenerationComplete.');
                    resolveReportGeneration();
                };
                // Callback for report.js to signal an error during its execution.
                window.reportGenerationError = (error) => {
                    console.error('JSDOM: report.js signaled reportGenerationError.', error);
                    rejectReportGeneration(error);
                };

                // Optional: A basic fetch mock as a fallback.
                // If report.js is correctly modified, this mock shouldn't be strictly necessary for project.json/build.json,
                // but it can help diagnose issues or handle other potential fetch calls.
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    const normalizedUrl = url.toString().startsWith('file://') ? path.basename(url) : url;
                    if (normalizedUrl === 'project.json') {
                        console.log('JSDOM: Mock fetch intercepting project.json');
                        return { ok: true, json: async () => projectData, text: async () => JSON.stringify(projectData) };
                    }
                    if (normalizedUrl === 'build.json') {
                        console.log('JSDOM: Mock fetch intercepting build.json');
                        return { ok: true, json: async () => buildData, text: async () => JSON.stringify(buildData) };
                    }
                    // For any other fetch calls, try to use JSDOM's original fetch or reject.
                    if (originalFetch) {
                         console.log(`JSDOM: Passing through fetch for ${url} to original fetch.`);
                         return originalFetch.call(window, url, options);
                    }
                    console.warn(`JSDOM: Unmocked fetch call to ${url} and no original fetch available.`);
                    return Promise.reject(new Error(`Fetch not available or mocked for ${url}`));
                };
            }
        });

        console.log('JSDOM instance created. Waiting for report.js to complete DOM manipulations via reportGeneratedPromise...');

        // 3. Wait for report.js to execute and signal completion.
        // The `DOMContentLoaded` event in the modified report.js will fire,
        // it will process the data, manipulate the DOM, and then call `window.reportGenerationComplete()`.
        await reportGeneratedPromise;

        console.log('report.js has completed. Proceeding to finalize static HTML...');
        const { window } = dom;
        const { document } = window; // Get the document object from JSDOM

        // 4. Inline CSS: Embed styles directly into the HTML.
        // Create a <style> element.
        const styleElement = document.createElement('style');
        styleElement.textContent = cssContent; // Add all CSS rules.
        document.head.appendChild(styleElement); // Append to <head>.

        // Remove the original <link> to styles.css, as styles are now inlined.
        const existingCssLink = document.querySelector('link[rel="stylesheet"][href="styles.css"]');
        if (existingCssLink) {
            existingCssLink.remove();
            console.log('Removed original CSS link.');
        }

        // 5. Remove the report.js script tag.
        // Its job (populating the DOM) is done. It's not needed in the static output.
        const reportScriptTag = document.querySelector('script[src="report.js"]');
        if (reportScriptTag) {
            reportScriptTag.remove();
            console.log('Removed original report.js script tag.');
        }

        // 6. Serialize the fully populated and modified DOM to an HTML string.
        const staticHtmlContent = dom.serialize();
        console.log('DOM serialized to static HTML string.');

        // 7. Write the static HTML content to the output file.
        await fs.writeFile(OUTPUT_HTML_PATH, staticHtmlContent, 'utf8');
        console.log(`Static report successfully generated: ${path.resolve(OUTPUT_HTML_PATH)}`);

    } catch (error) {
        console.error('Error occurred during static report generation:', error);
        process.exit(1); // Exit with an error code to indicate failure.
    }
}

// Run the generation function.
generateStaticReport();
