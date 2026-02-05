#!/bin/bash

# Setup script to create Artifact Registry repository for Cloud Build
# Usage: ./setup-artifact-registry.sh [REGION]

set -e

PROJECT_ID="gen-lang-client-0440861031"
REPO_NAME="docker-repo"
LOCATION="${1:-us-west1}"  # Default to us-west1 if not provided

echo "Creating Artifact Registry repository..."
echo "Project: $PROJECT_ID"
echo "Repository: $REPO_NAME"
echo "Location: $LOCATION"
echo ""

# Create the repository
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --description="Docker repository for ImpactFlow OS" || {
    echo ""
    echo "Repository might already exist. Checking..."
    gcloud artifacts repositories describe "$REPO_NAME" \
      --location="$LOCATION" \
      --project="$PROJECT_ID" && {
        echo "✓ Repository already exists at $LOCATION"
      }
  }

echo ""
echo "✓ Repository created successfully!"
echo ""
echo "Next steps:"
echo "1. Go to Cloud Build Triggers: https://console.cloud.google.com/cloud-build/triggers"
echo "2. Edit your trigger"
echo "3. Add substitution variables:"
echo "   - _ARTIFACT_REPO = $REPO_NAME"
echo "   - _LOCATION = $LOCATION"
echo "4. Save and trigger a new build"
echo ""
