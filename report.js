// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically add info-items based on conditions
    Promise.all([
        fetch('project.json').then(response => response.ok ? response.json() : Promise.reject('Failed to load project.json')),
        fetch('build.json').then(response => response.ok ? response.json() : Promise.reject('Failed to load build.json'))
    ])
    .then(([projectData, buildData]) => {
        // Keep data sources separate and render the report
        renderReport(projectData.project, buildData.build);
    })
    .catch(error => {
        console.error('Error loading report data:', error);
    });
});

// Function to render the report using the separate data sources
const renderReport = (project, build) => {
    // Project information
    updateElement('project-id', project?.id);
    updateElement('project-name', project?.name);
    updateElement('project-description', project?.description);
    updateElement('project-type', project?.type);

    // Application information
    const { application } = project ?? {};
    if (application) {
        updateElement('application-id', application.id);
        updateElement('application-name', application.name);
        updateElement('application-idip', application.idip);
    }

    // Team information
    const { team } = project ?? {};
    if (team) {
        updateElement('team-code', team.code, generateGitHubLink('team', build, project));
        updateElement('team-slug', team.slug);
    }

    // Organization and repository
    updateElement('organisation', build?.owner, generateGitHubLink('organisation', build, project));
    updateElement('repository', build?.repository, generateGitHubLink('repository', build, project));

    // Build information
    const { run_id, run_number, run_attempt, workflow_ref, version, ref_name, revision, actor, runner, protected_branch, snapshot, captured_at, assets } = build ?? {};

    const buildRef = formatBuildReference(run_id, run_number, run_attempt);
    const workflow = extractWorkflowName(workflow_ref);

    if (version) {
        updateElement('version', version, generateGitHubLink('version', build, project));
    } else {
        const versionEl = document.getElementById('version');
        if (versionEl) versionEl.parentElement.style.display = 'none';
    }

    updateElement('build-reference', buildRef, generateGitHubLink('build-reference', build, project));
    updateElement('branch', ref_name);

    if (revision) {
        updateElement('revision', revision.substring(0, 7), generateGitHubLink('commit', build, project));
    }

    updateElement('actor', actor);
    updateElement('runner', runner);

    if (workflow) {
        updateElement('workflow', workflow, generateGitHubLink('workflow', build, project));
    }

    if (captured_at) {
        const date = new Date(captured_at);
        updateElement('timestamp', date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' }));
    }

    updateElement('build-system', project?.build_system);

    // Update protection badge if branch protection info exists
    if (protected_branch !== undefined) {
        updateBadge(
            'protection',
            protected_branch,
            'Protected',
            'badge-success',
            'Unprotected',
            'badge-subtle'
        );
    }

    // Update maturity badge if snapshot info exists
    if (snapshot !== undefined) {
        updateBadge(
            'project-maturity',
            !snapshot,
            'Release',
            'badge-success',
            'Snapshot',
            'badge-secondary'
        );
    }

    // Add default branch badge if this is the default branch
    if (build?.ref_default === ref_name) {
        const defaultBadgeContainer = document.createElement('span');
        defaultBadgeContainer.className = 'badge badge-subtle';
        defaultBadgeContainer.textContent = 'Default';
        defaultBadgeContainer.style.marginLeft = 'var(--spacing-xs)';

        // Find the branch container and add the badge after the protection badge
        const branchContainer = document.getElementById('branch').parentElement;
        branchContainer.appendChild(defaultBadgeContainer);
    }

    // Delivery information
    const deliverySection = document.getElementById('delivery-section');
    const deliveryInfoList = document.getElementById('delivery-info-list');

    if (project?.delivery && deliveryInfoList) {
        // Clear any existing items
        deliveryInfoList.innerHTML = '';

        const { deploy } = project.delivery ?? {};
        const { kubernetes } = deploy ?? {};

        addInfoItem(deliveryInfoList, 'delivery-type', 'Type', 'Deployment');
        addInfoItem(deliveryInfoList, 'destination', 'Destination', kubernetes ? "Kubernetes" : "");
        addInfoItem(deliveryInfoList, 'namespace', 'Namespace', kubernetes?.namespace);
        addInfoItem(deliveryInfoList, 'mechanism', 'Mechanism', kubernetes?.type);

        deliverySection.style.display = '';
    }

    // Handle languages
    const languages = project?.languages ?? [];
    if (languages.length) {
        const langContainer = document.getElementById('languages');
        if (langContainer) {
            langContainer.innerHTML = '';
            languages.forEach(lang => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = lang;
                langContainer.appendChild(tagSpan);
            });
        }
    }

    // Integration information
    const { references } = project ?? {};
    updateElement('issue-tracking', references?.jira, generateJiraLink(references?.jira));
    updateElement('change-management', references?.servicenow, generateServiceNowLink(references?.servicenow));
    updateElement('team-city', references?.team_city, generateTeamCityLink(references?.team_city));

    // Assets
    if (assets?.length > 0) {
        const assetsContainer = document.querySelector('.assets-list');
        if (assetsContainer) {
            assetsContainer.innerHTML = '';
            assets.map(getAsset).forEach(asset => {
                assetsContainer.appendChild(createAssetElement(asset));
            });
        }
    }
};

const generateGitHubLink = (type, build, project) => {
    const { owner, repository, version, run_id, run_number, run_attempt, revision, workflow_ref } = build ?? {};

    switch (type) {
        case 'organisation':
            return owner ? `https://github.com/${owner}` : null;
        case 'repository':
            return owner && repository ? `https://github.com/${owner}/${repository}` : null;
        case 'version':
            return owner && repository && version ?
                `https://github.com/${owner}/${repository}/releases/tag/v${version}` : null;
        case 'build-reference':
            const buildRef = formatBuildReference(run_id, run_number, run_attempt);
            return owner && repository && buildRef ?
                `https://github.com/${owner}/${repository}/actions/runs/${buildRef.split('.')[0]}` : null;
        case 'commit':
            return owner && repository && revision ?
                `https://github.com/${owner}/${repository}/commit/${revision}` : null;
        case 'workflow':
            const workflow = extractWorkflowName(workflow_ref);
            return owner && repository && workflow ?
                `https://github.com/${owner}/${repository}/blob/main/.github/workflows/${workflow}` : null;
        case 'team':
            return owner && project?.team?.slug ?
                `https://github.com/orgs/${owner}/teams/${project.team.slug}` : null;
        default:
            return null;
    }
};

const generateJiraLink = data => data ? `https://jira.example.com/projects/${data}` : null;
const generateServiceNowLink = data => data ? `https://servicenow.example.com/item/${data}` : null;
const generateTeamCityLink = data => data ? `https://teamcity.example.com/project/${data}` : null;

const updateElement = (id, value, hrefTemplate = null) => {
    if (!value) return;
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = value;
    if (hrefTemplate) el.href = hrefTemplate;
};

const updateBadge = (id, isActive, activeText, activeClass, inactiveText, inactiveClass) => {
    const badge = document.getElementById(id);
    if (!badge) return;

    badge.style.display = '';
    badge.textContent = isActive ? activeText : inactiveText;
    badge.classList.add(isActive ? activeClass : inactiveClass);
};

const updateInfoItem = (id, value, condition) => {
    const item = document.getElementById(id)?.closest('.info-item');
    if (condition) {
        updateElement(id, value);
        if (item) item.style.display = '';
    } else {
        if (item) item.style.display = 'none';
    }
};

const addInfoItem = (container, id, label, value) => {
    if (!value) return;

    const infoItem = document.createElement('div');
    infoItem.className = 'info-item';

    const itemLabel = document.createElement('div');
    itemLabel.className = 'item-label';
    itemLabel.textContent = label;

    const itemValue = document.createElement('div');
    itemValue.className = 'item-value';
    itemValue.id = id;
    itemValue.textContent = value;

    infoItem.appendChild(itemLabel);
    infoItem.appendChild(itemValue);
    container.appendChild(infoItem);
};

const createAssetElement = ({ name, type, url, icon = 'file_present' }) => {
    const assetItem = document.createElement('a');
    assetItem.href = url ?? '#';
    assetItem.className = 'asset-item';
    assetItem.target = '_blank';

    assetItem.innerHTML = `
        <div class="asset-icon"><span class="material-symbols-rounded">${icon}</span></div>
        <div class="asset-info">
            <div class="asset-name">${name}</div>
            <div class="asset-type">${type}</div>
        </div>
    `;

    return assetItem;
};

const getAsset = asset => {
    // Extract just the filename from paths
    const fullName = asset.name;
    const displayName = fullName.includes('/') ?
        fullName.substring(fullName.lastIndexOf('/') + 1) :
        fullName;

    // Get icon and label based on asset type
    const { icon, label } = getAssetIcon(asset.type);

    return {
        name: displayName,
        fullName: fullName, // Keep the original full name for reference
        type: label ?? asset.type,
        icon,
        url: asset.url ?? '#'
    };
};

const getAssetIcon = (type, packageType) => {
    if (!type) return { icon: 'file_present', label: 'Unknown' };

    const lowerType = type.toLowerCase();

    // Handle other asset types
    switch (lowerType) {
        case 'container-image': return { icon: 'deployed_code', label: 'Container Image' };
        case 'helm-chart': return { icon: 'anchor', label: 'Helm Chart' };
        case 'docs': return { icon: 'description', label: 'Documentation' };
        case 'source': return { icon: 'code', label: 'Source' };
        case 'package': return { icon: 'package_2', label: 'Package' };
        default: return { icon: 'file_present', label: type };
    }
};

const extractWorkflowName = workflowRef => {
    if (!workflowRef) return null;
    const match = workflowRef.match(/\.github\/workflows\/([^@]+)/);
    return match?.[1] ?? null;
};

const formatBuildReference = (runId, runNumber, runAttempt) =>
    runId ? `${runId}.${runNumber}.${runAttempt}` : null;
