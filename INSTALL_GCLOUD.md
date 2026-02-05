# Install Google Cloud SDK (gcloud CLI)

## macOS Installation

### Option A: Using Homebrew (Easiest)
```bash
brew install --cask google-cloud-sdk
```

After installation, restart your terminal or run:
```bash
source ~/.zshrc
```

### Option B: Manual Installation
1. Download the installer:
   ```bash
   curl https://sdk.cloud.google.com | bash
   ```

2. Restart your terminal or run:
   ```bash
   exec -l $SHELL
   ```

3. Initialize gcloud:
   ```bash
   gcloud init
   ```

## Verify Installation
```bash
gcloud --version
```

## Authenticate
```bash
gcloud auth login
gcloud config set project gen-lang-client-0440861031
```

## After Installation
Once gcloud is installed, run:
```bash
cd impactflow-os
./setup-artifact-registry.sh us-west1
```

Or manually:
```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-west1 \
  --project=gen-lang-client-0440861031
```
