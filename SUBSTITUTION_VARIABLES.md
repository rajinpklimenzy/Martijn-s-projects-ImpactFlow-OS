# Cloud Build Substitution Variables Fix

## The Problem
The error `invalid argument "-docker.pkg.dev///impactflow-os:835e373"` shows that substitution variables weren't being replaced, causing empty values.

## Solution Applied
Updated `cloudbuild.yaml` to use **built-in substitution variables** that Cloud Build provides automatically:

- `$PROJECT_ID` - Your Google Cloud project ID (built-in)
- `$SHORT_SHA` - First 7 characters of commit SHA (built-in)
- `$LOCATION` - Build region (built-in, e.g., "us-west1")
- `$REPO_NAME` - GitHub repository name (built-in for triggers)

## If $REPO_NAME Doesn't Match Your Artifact Registry Repository

If your Artifact Registry repository name is different from your GitHub repo name, you have two options:

### Option 1: Use Custom Substitution (Recommended)

1. Edit your Cloud Build trigger
2. Go to **"Substitution variables"** section
3. Add:
   - **Variable name:** `_REPOSITORY`
   - **Value:** Your Artifact Registry repository name (e.g., `docker-repo` or `my-artifact-repo`)
4. In `cloudbuild.yaml`, replace `${REPO_NAME}` with `${_REPOSITORY}`

### Option 2: Rename Artifact Registry Repository

Rename your Artifact Registry repository to match your GitHub repo name so `$REPO_NAME` works automatically.

## Verify Your Artifact Registry Setup

1. Go to: https://console.cloud.google.com/artifacts
2. Check your repository name in the format: `[REGION]-docker.pkg.dev/[PROJECT_ID]/[REPOSITORY_NAME]`
3. Make sure the repository name matches what you're using in the build config

## Test the Build

After updating, commit and push the changes. The build should now properly substitute:
- `${LOCATION}` → `us-west1` (or your region)
- `${PROJECT_ID}` → Your project ID
- `${REPO_NAME}` → Your GitHub repo name (or `$_REPOSITORY` if using custom)
- `${SHORT_SHA}` → Commit SHA (e.g., `835e373`)

The final image tag should look like:
`us-west1-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPO/impactflow-os:835e373`
