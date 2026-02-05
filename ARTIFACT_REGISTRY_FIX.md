# Fix: Artifact Registry 404 Error

## The Problem
The build fails with a 404 error when trying to push to Artifact Registry:
```
error parsing HTTP 404 response body: invalid character '<' looking for beginning of value
The requested URL /v2/gen-lang-client-0440861031/martijn-s-projects-impactflow-os/impactflow-os/blobs/uploads/ was not found
```

**Root causes:**
1. The Artifact Registry repository doesn't exist
2. The location is set to "global" (invalid - Artifact Registry requires a specific region like `us-west1`)
3. The repository name doesn't match what's configured in the build

**Note:** The error shows it's trying to use `global-docker.pkg.dev` - "global" is not a valid Artifact Registry location. You must use a specific region.

## Solution: Create the Artifact Registry Repository

### Step 1: Create the Repository

Run this command to create the Artifact Registry repository (replace `us-west1` with your preferred region):

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-west1 \
  --project=gen-lang-client-0440861031
```

**Common regions:**
- `us-west1` (Oregon)
- `us-central1` (Iowa)
- `us-east1` (South Carolina)
- `europe-west1` (Belgium)
- `asia-east1` (Taiwan)

### Step 2: Configure Cloud Build Trigger

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click on your trigger (the one that's failing)
3. Click **"EDIT"**
4. Scroll down to **"Substitution variables"** section
5. Add these variables:
   - **Variable name:** `_ARTIFACT_REPO`
     **Value:** `docker-repo` (or your repository name)
   - **Variable name:** `_LOCATION`
     **Value:** `us-west1` (or your repository region)
6. Click **"SAVE"**

### Step 3: Verify Repository Exists

Check that your repository exists:
```bash
gcloud artifacts repositories list --project=gen-lang-client-0440861031
```

You should see output like:
```
REPOSITORY    FORMAT  LOCATION
docker-repo   DOCKER  us-west1
```

### Step 4: Verify Permissions

Ensure Cloud Build has permission to push to Artifact Registry:
```bash
# Grant Cloud Build service account access
gcloud projects add-iam-policy-binding gen-lang-client-0440861031 \
  --member="serviceAccount:$(gcloud projects describe gen-lang-client-0440861031 --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

## Alternative: Use Existing Repository

If you already have an Artifact Registry repository with a different name:

1. Find your repository name:
   ```bash
   gcloud artifacts repositories list --project=gen-lang-client-0440861031
   ```

2. In your Cloud Build trigger, set:
   - `_ARTIFACT_REPO` = your existing repository name
   - `_LOCATION` = your repository's location

## Verify the Fix

After creating the repository and updating the trigger:

1. Commit and push your changes (or manually trigger the build)
2. The build should now successfully push to Artifact Registry
3. Check the build logs - you should see:
   ```
   Successfully pushed
   ```

## Troubleshooting

### Still getting 404?
- Double-check the repository name matches exactly (case-sensitive)
- Verify the location/region matches
- Ensure the repository format is `docker` (not `maven`, `npm`, etc.)

### Permission denied?
- Run the IAM policy binding command from Step 4
- Check that your Cloud Build service account has `artifactregistry.writer` role

### Wrong region?
- Update `_LOCATION` in your trigger substitutions
- Or recreate the repository in the correct region
