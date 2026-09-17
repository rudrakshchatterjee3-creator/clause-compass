#!/usr/bin/env bash
# Builds the container and deploys Clause Compass to Google Cloud Run.
#
# Prerequisites:
#   - gcloud CLI authenticated (`gcloud auth login`) with a default project set,
#     or pass PROJECT_ID below.
#   - A Secret Manager secret holding the Gemini API key (see SECRET_NAME).
#     Create it once with:
#       gcloud secrets create gemini-api-key --replication-policy=automatic
#       printf '%s' 'your-real-key' | gcloud secrets versions add gemini-api-key --data-file=-
#   - The Cloud Run service account needs the "Secret Manager Secret Accessor"
#     role on that secret.
#
# Usage:
#   ./scripts/deploy.sh
# Every setting below can be overridden via environment variables, e.g.:
#   REGION=asia-south1 SERVICE_NAME=clause-compass-staging ./scripts/deploy.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-clause-compass}"
SECRET_NAME="${SECRET_NAME:-gemini-api-key}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
IMAGE="${IMAGE:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${SERVICE_NAME}:$(git rev-parse --short HEAD)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is not set and no default gcloud project is configured." >&2
  echo "Run: gcloud config set project <your-project-id>" >&2
  exit 1
fi

echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE_NAME}"
echo "Image:    ${IMAGE}"
echo "Secret:   ${SECRET_NAME} -> GEMINI_API_KEY"
echo

echo "Building and pushing the container image with Cloud Build..."
gcloud builds submit --tag "${IMAGE}" --project "${PROJECT_ID}"

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60 \
  --set-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest" \
  --set-env-vars "GEMINI_MODEL=${GEMINI_MODEL}"

echo
echo "Deployed. Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)'
