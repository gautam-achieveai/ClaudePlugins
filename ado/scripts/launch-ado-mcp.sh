#!/bin/bash
# Auto-detect Azure DevOps configuration from git remote URL.
#
# Supports these remote URL formats:
#   https://{org}.visualstudio.com/{project}/_git/{repo}
#   https://dev.azure.com/{org}/{project}/_git/{repo}
#   git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
#   {org}@vs-ssh.visualstudio.com:v3/{org}/{project}/{repo}
#
# Template: <AZURE_DEVOPS_ORG_URL>/<PROJECT>/_git/<REPOSITORY>
#
# If AZURE_DEVOPS_ORG_URL / AZURE_DEVOPS_PROJECT are already set,
# they take priority over auto-detection.

detect_from_git_remote() {
    local remote_url
    remote_url=$(git remote get-url origin 2>/dev/null) || return 1

    # Strip trailing .git if present
    remote_url="${remote_url%.git}"

    # https://{org}.visualstudio.com/{project}/_git/{repo}
    if [[ "$remote_url" =~ ^https://([^/]+\.visualstudio\.com)/([^/]+)/_git/([^/]+)$ ]]; then
        _ORG_URL="https://${BASH_REMATCH[1]}"
        _PROJECT="${BASH_REMATCH[2]}"
        _REPOSITORY="${BASH_REMATCH[3]}"
        return 0
    fi

    # https://dev.azure.com/{org}/{project}/_git/{repo}
    if [[ "$remote_url" =~ ^https://dev\.azure\.com/([^/]+)/([^/]+)/_git/([^/]+)$ ]]; then
        _ORG_URL="https://dev.azure.com/${BASH_REMATCH[1]}"
        _PROJECT="${BASH_REMATCH[2]}"
        _REPOSITORY="${BASH_REMATCH[3]}"
        return 0
    fi

    # git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
    if [[ "$remote_url" =~ ^git@ssh\.dev\.azure\.com:v3/([^/]+)/([^/]+)/([^/]+)$ ]]; then
        _ORG_URL="https://dev.azure.com/${BASH_REMATCH[1]}"
        _PROJECT="${BASH_REMATCH[2]}"
        _REPOSITORY="${BASH_REMATCH[3]}"
        return 0
    fi

    # {org}@vs-ssh.visualstudio.com:v3/{org}/{project}/{repo}
    if [[ "$remote_url" =~ ^[^@]+@vs-ssh\.visualstudio\.com:v3/([^/]+)/([^/]+)/([^/]+)$ ]]; then
        _ORG_URL="https://dev.azure.com/${BASH_REMATCH[1]}"
        _PROJECT="${BASH_REMATCH[2]}"
        _REPOSITORY="${BASH_REMATCH[3]}"
        return 0
    fi

    return 1
}

# Auto-detect if any required variable is missing
if [ -z "$AZURE_DEVOPS_ORG_URL" ] || [ -z "$AZURE_DEVOPS_PROJECT" ] || [ -z "$AZURE_DEVOPS_REPOSITORY" ]; then
    if detect_from_git_remote; then
        export AZURE_DEVOPS_ORG_URL="${AZURE_DEVOPS_ORG_URL:-$_ORG_URL}"
        export AZURE_DEVOPS_PROJECT="${AZURE_DEVOPS_PROJECT:-$_PROJECT}"
        export AZURE_DEVOPS_REPOSITORY="${AZURE_DEVOPS_REPOSITORY:-$_REPOSITORY}"
    else
        echo "WARNING: Could not detect Azure DevOps configuration from git remote." >&2
        echo "Set AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_REPOSITORY environment variables." >&2
    fi
fi

# Default non-user-specific settings
export AZURE_DEVOPS_IS_ON_PREMISES="${AZURE_DEVOPS_IS_ON_PREMISES:-false}"
export AZURE_DEVOPS_AUTH_TYPE="${AZURE_DEVOPS_AUTH_TYPE:-entra}"

exec npx @achieveai/azuredevops-mcp "$@"
