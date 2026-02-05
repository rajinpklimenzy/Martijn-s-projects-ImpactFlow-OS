# Fix: "build.service_account" / logs_bucket error

This error means the **trigger** is using a custom **Service account** but the build config that runs **does not** include the required logging option. That happens when the trigger is set to **"Dockerfile"** instead of **"Cloud Build configuration file"**, so `cloudbuild.yaml` is never used.

Pick **one** of these fixes.

---

## Option A: Use the default Cloud Build service account (fastest)

If you don’t need a custom service account for the build:

1. Open [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers).
2. Click your trigger (e.g. the one for impactflow-os).
3. Click **Edit**.
4. In **Configuration**:
   - Find **Service account** (or **Build service account**).
   - Set it to **"Default (Cloud Build service account)"** or clear it so no custom account is used.
5. **Save**.

The error goes away because the build no longer has a custom `service_account`, so the logging rule doesn’t apply.

---

## Option B: Keep your custom service account and use `cloudbuild.yaml`

If you need a custom service account, the trigger **must** use this repo’s `cloudbuild.yaml` (which already has the required options).

1. Open [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers).
2. Click your trigger → **Edit**.
3. Under **Configuration**:
   - Change **Build configuration** from **"Dockerfile"** to **"Cloud Build configuration file (yaml or json)"**.
   - Set **Cloud Build configuration file location** to:
     - **`impactflow-os/cloudbuild.yaml`**  
       (use this if your repo root is the folder that *contains* `impactflow-os`).
     - Or **`cloudbuild.yaml`**  
       (only if your trigger’s source is set so the repo root *is* the `impactflow-os` folder).
4. **Save**.
5. Run the build again.

After this, the build will use `impactflow-os/cloudbuild.yaml`, which already sets `defaultLogsBucketBehavior` and `logging`, so the error should stop.

---

## Check your trigger

- If **Build configuration** = **Dockerfile** → this file is **not** used; apply Option A or B above.
- If **Build configuration** = **Cloud Build configuration file** → confirm the path is exactly **`impactflow-os/cloudbuild.yaml`** (or `cloudbuild.yaml` if repo root is `impactflow-os`).
