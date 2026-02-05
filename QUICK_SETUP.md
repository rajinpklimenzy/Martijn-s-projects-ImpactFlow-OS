# Quick Setup Guide - Create Artifact Registry Repository

## Step 1: Add gcloud to Your PATH (Permanent)

Add these lines to your `~/.zshrc` file:

```bash
# Google Cloud SDK
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
export CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.13/libexec/bin/python3
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Step 2: Authenticate with Google Cloud

```bash
gcloud auth login
```

This will open a browser window. Sign in with your Google account that has access to the project.

## Step 3: Set the Project

```bash
gcloud config set project gen-lang-client-0440861031
```

## Step 4: Create the Artifact Registry Repository

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-west1 \
  --project=gen-lang-client-0440861031 \
  --description="Docker repository for ImpactFlow OS"
```

## Step 5: Grant Cloud Build Permissions

```bash
PROJECT_NUMBER=$(gcloud projects describe gen-lang-client-0440861031 --format='value(projectNumber)')
gcloud projects add-iam-policy-binding gen-lang-client-0440861031 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

## Step 6: Verify Repository Created

```bash
gcloud artifacts repositories list --project=gen-lang-client-0440861031
```

You should see:
```
REPOSITORY    FORMAT  LOCATION
docker-repo   DOCKER  us-west1
```

## Step 7: Trigger a New Build

Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers) and run your trigger again. The build should now succeed!

---

## Alternative: Use the Setup Script

After completing Steps 1-3 above, you can use the setup script:

```bash
cd impactflow-os
./setup-artifact-registry.sh us-west1
```
