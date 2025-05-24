// Main rendering function for the build report
const renderReport = (project, build) => {
    populateHeader(project)
    populateBuildHighlights(project, build)
    populateBuild(project, build)
    populateProject(project, build)
    populateDelivery(project, build)
    populateIntegration(project, build)
    populateAssets(build.assets)

    updateBadges(build, project)
}

const populateHeader = (project) => {
    updateElement("project-name", project.name)
    updateElement("project-description", project.description)
    updateElement("project-type", project.type)
    updateElement("application-name", project.application?.name)
}

const populateBuildHighlights = (project, build) => {
    updateElement("version", build.version, generateGitHubLink("version", build, project))
    updateElement("build-reference",
        formatBuildReference(build.run_id, build.run_number, build.run_attempt),
        generateGitHubLink("build-reference", build, project))
    updateElement("branch", build.ref_name)
}

const populateBuild = (project, build) => {
    updateElement("organisation", build.owner, generateGitHubLink("organisation", build, project))
    updateElement("repository", build.repository, generateGitHubLink("repository", build, project))
    updateElement("revision", build.revision.substring(0, 7), generateGitHubLink("commit", build, project))
    updateElement("actor", build.actor)
    updateElement("runner", build.runner)
    updateElement("timestamp", new Date(build.captured_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }))
    updateElement("build-system", project.build_system)

    const workflow = extractWorkflowName(build.workflow_ref)
    if (workflow) {
        updateElement("workflow", workflow, generateGitHubLink("workflow", build, project))
    }
}

const populateProject = (project, build) => {
    updateElement("project-id", project.id)
    updateElement("application-id", project.application?.id)
    updateElement("team-code", project.team?.code, generateGitHubLink("team", build, project))
    updateElement("team-slug", project.team?.slug)

    populateLanguages(project)
}

const populateDelivery = (project, build) => {
    if (!project.delivery) {
        return
    }

    const deliveryInfoList = document.getElementById("delivery-info-list")

    // Clear any existing items
    deliveryInfoList.replaceChildren()

    const { deploy } = project.delivery ?? {}
    const { kubernetes } = deploy ?? {}

    addInfoItem(deliveryInfoList, "delivery-type", "Type", "Deployment")
    addInfoItem(deliveryInfoList, "destination", "Destination", kubernetes ? "Kubernetes" : "")
    addInfoItem(deliveryInfoList, "namespace", "Namespace", kubernetes?.namespace)
    addInfoItem(deliveryInfoList, "mechanism", "Mechanism", kubernetes?.type)

    document.getElementById("delivery-section").style.display = ""
}

const populateIntegration = (project, build) => {
    const { references } = project ?? {}

    updateElement("issue-tracking", references?.jira, generateJiraLink(references?.jira))
    updateElement("change-management", references?.servicenow, generateServiceNowLink(references?.servicenow))
    updateElement("teamcity", references?.teamcity, generateTeamCityLink(references?.teamcity))
    updateElement("application-idip", project.application.idip)
}

const generateGitHubLink = (type, build, project) => {
    const { owner, repository, version, run_id, run_number, run_attempt, revision, workflow_ref } = build ?? {}

    switch (type) {
        case "organisation":
            return `https://github.com/${owner}`
        case "repository":
            return `https://github.com/${owner}/${repository}`
        case "version":
            return version ? `https://github.com/${owner}/${repository}/releases/tag/v${version}` : null
        case "build-reference":
            const buildRef = formatBuildReference(run_id, run_number, run_attempt)
            return buildRef ? `https://github.com/${owner}/${repository}/actions/runs/${buildRef.split(".")[0]}` : null
        case "commit":
            return `https://github.com/${owner}/${repository}/commit/${revision}`
        case "workflow":
            const workflow = extractWorkflowName(workflow_ref)
            return workflow ? `https://github.com/${owner}/${repository}/blob/main/.github/workflows/${workflow}` : null
        case "team":
            return project.team?.slug ? `https://github.com/orgs/${owner}/teams/${project.team.slug}` : null
        default:
            return null
    }
}

const generateJiraLink = data => data ? `https://jira.example.com/projects/${data}` : null
const generateServiceNowLink = data => data ? `https://servicenow.example.com/item/${data}` : null
const generateTeamCityLink = data => data ? `https://teamcity.example.com/project/${data}` : null

// Function to handle all badge updates based on build state
const updateBadges = (build, project) => {
    const { protected_branch, snapshot, production_process, pre_release, version, ref_name, ref_default } = build ?? {}
    const isDefaultBranch = ref_default === ref_name

    // Update production process badge
    if (production_process === true) {
        updateBadge("production", "Production", "badge-subtle")
    } else if (production_process === false) {
        updateBadge("production", "Non-Production", "badge-subtle")
    }

    if (!version) {
        updateBadge("version-missing", "None", "badge-subtle")
    }

    // Update release-maturity badge
    if (pre_release === true) {
        updateBadge("release-maturity", "Pre-Release", "badge-secondary")
    } else if (pre_release === false) {
        updateBadge("release-maturity", "Final", "badge-success")
    }

    // Update maturity badge if snapshot info exists
    if (snapshot === true) {
        updateBadge("build-maturity", "Snapshot", pre_release === false ? "badge-danger" : "badge-secondary")
    } else if (snapshot === false) {
        updateBadge("build-maturity", "Release", "badge-success")
    }

    // Show default branch badge if this is the default branch
    if (isDefaultBranch) {
        updateBadge("default-branch", "Default", "badge-subtle")
    }

    // Update badge based on branch protection status and whether it's the default branch
    if (protected_branch === true) {
        updateBadge("protected-branch", "Protected", "badge-success")
    } else if (protected_branch === false) {
        if (isDefaultBranch) {
            updateBadge("protected-branch", "Unprotected", production_process ? "badge-danger" : "badge-warning")
        } else {
            updateBadge("protected-branch", "Unprotected", "badge-subtle")
        }
    }

    // Check if application IDIP is missing or empty
    const idip = project.application?.idip
    if (production_process == true && (!idip || idip.trim() === "")) {
        updateBadge("idip-presence", "Missing", "badge-warning")
    }
}

const updateBadge = (id, text, styleClass) => {
    const badge = document.getElementById(id)
    if (!badge) return

    badge.style.display = ""
    badge.textContent = text
    badge.classList.add(styleClass)
}

const populateLanguages = (project) => {
    const languages = project.languages ?? []
    if (languages.length) {
        const langContainer = document.getElementById("languages")
        if (langContainer) {
            langContainer.replaceChildren()
            languages.forEach(lang => {
                langContainer.appendChild(createElement("span", "tag", lang))
            })
        }
    }
}

const populateAssets = (assets) => {
    if (assets?.length > 0) {
        const assetsContainer = document.querySelector(".assets-list")
        if (assetsContainer) {
            assetsContainer.replaceChildren()
            assets.map(getAsset).forEach(asset => {
                assetsContainer.appendChild(createAssetElement(asset))
            })
        }
    }
}

const createAssetElement = ({ name, type, url, icon = "file_present" }) => {
    // Create individual elements using helper functions
    const iconSpan = createElement("span", "material-symbols-rounded", icon)
    const iconDiv = createContainer("asset-icon", [iconSpan])

    const nameDiv = createElement("div", "asset-name", name)
    const typeDiv = createElement("div", "asset-type", type)
    const infoDiv = createContainer("asset-info", [nameDiv, typeDiv])

    // Create the asset item link element with attributes
    const assetItem = createElement("a", "asset-item", null, {
        href: url ?? "#",
        target: "_blank"
    })

    // Append all elements to the asset item
    assetItem.appendChild(iconDiv)
    assetItem.appendChild(infoDiv)

    return assetItem
}

const getAsset = asset => {
    // Extract just the filename from paths
    const fullName = asset.name
    const displayName = fullName.includes("/") ?
        fullName.substring(fullName.lastIndexOf("/") + 1) :
        fullName

    // Get icon and label based on asset type
    const { icon, label } = getAssetIcon(asset.type)

    return {
        name: displayName,
        fullName: fullName, // Keep the original full name for reference
        type: label ?? asset.type,
        icon,
        url: asset.url ?? "#"
    }
}

const getAssetIcon = (type, packageType) => {
    if (!type) return { icon: "file_present", label: "Unknown" }

    const lowerType = type.toLowerCase()

    // Handle other asset types
    switch (lowerType) {
        case "container-image": return { icon: "deployed_code", label: "Container Image" }
        case "helm-chart": return { icon: "anchor", label: "Helm Chart" }
        case "docs": return { icon: "description", label: "Documentation" }
        case "source": return { icon: "code", label: "Source" }
        case "package": return { icon: "package_2", label: "Package" }
        default: return { icon: "file_present", label: type }
    }
}

const extractWorkflowName = workflowRef => {
    if (!workflowRef) return null
    const match = workflowRef.match(/\.github\/workflows\/([^@]+)/)
    return match?.[1] ?? null
}

const formatBuildReference = (runId, runNumber, runAttempt) =>
    runId ? `${runId}.${runNumber}.${runAttempt}` : null


// DOM Helper Functions

const addInfoItem = (container, id, label, value) => {
    if (!value) return

    const itemLabel = createElement("div", "item-label", label)
    const itemValue = createElement("div", "item-value", value, { id })
    const infoItem = createContainer("info-item", [itemLabel, itemValue])

    container.appendChild(infoItem)
}

const updateElement = (id, value, hrefTemplate = null) => {
    if (!value) return
    const el = document.getElementById(id)
    if (!el) return

    el.textContent = value
    if (hrefTemplate) el.href = hrefTemplate
}

const createElement = (type, className, textContent, attributes = {}) => {
    const element = document.createElement(type)
    element.className = className
    element.textContent = textContent

    // Apply any additional attributes
    Object.entries(attributes).forEach(([key, value]) => {
        element[key] = value
    })

    return element
}

const createContainer = (className, children = []) => {
    const container = document.createElement("div")
    container.className = className
    children.forEach(child => container.appendChild(child))
    return container
}
