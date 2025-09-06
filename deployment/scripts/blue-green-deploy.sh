#!/bin/bash
set -e

# Blue-Green Deployment Script for Shell Platform
# This script implements a zero-downtime deployment strategy

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_DIR="$PROJECT_ROOT"
BACKUP_DIR="$PROJECT_ROOT/backup"
LOGS_DIR="$PROJECT_ROOT/logs"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    source "$PROJECT_ROOT/.env.production"
fi

# Default values
NAMESPACE="${NAMESPACE:-shell-platform}"
BLUE_SUFFIX="${BLUE_SUFFIX:-blue}"
GREEN_SUFFIX="${GREEN_SUFFIX:-green}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-600}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
MONITORING_ENABLED="${MONITORING_ENABLED:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/deployment.log"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/deployment.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/deployment.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOGS_DIR/deployment.log"
}

# Notification function
send_notification() {
    local message="$1"
    local status="$2"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        if [ "$status" = "error" ]; then
            color="danger"
        elif [ "$status" = "warning" ]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Shell Platform Deployment\", \"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
    fi
    
    log_info "Notification sent: $message"
}

# Health check function
health_check() {
    local service_url="$1"
    local timeout="$2"
    local interval=5
    local elapsed=0
    
    log_info "Starting health check for $service_url (timeout: ${timeout}s)"
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s --max-time 10 "$service_url/health" > /dev/null 2>&1; then
            log_success "Health check passed for $service_url"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log_info "Health check attempt $((elapsed / interval)) - waiting..."
    done
    
    log_error "Health check failed for $service_url after ${timeout}s"
    return 1
}

# Get current active deployment
get_active_deployment() {
    # Check which deployment is currently receiving traffic
    if kubectl get service "${NAMESPACE}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null | grep -q "$BLUE_SUFFIX"; then
        echo "$BLUE_SUFFIX"
    else
        echo "$GREEN_SUFFIX"
    fi
}

# Get inactive deployment
get_inactive_deployment() {
    local active="$(get_active_deployment)"
    if [ "$active" = "$BLUE_SUFFIX" ]; then
        echo "$GREEN_SUFFIX"
    else
        echo "$BLUE_SUFFIX"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required tools are installed
    for tool in kubectl docker helm; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Creating namespace $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    
    # Check Docker registry access
    if [ -n "$DOCKER_REGISTRY" ]; then
        if ! docker pull "$DOCKER_REGISTRY/hello-world" &> /dev/null; then
            log_warn "Cannot access Docker registry $DOCKER_REGISTRY"
        fi
    fi
    
    log_success "Pre-deployment checks completed"
}

# Database migration
run_migrations() {
    log_info "Running database migrations..."
    
    # Create migration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migration
        image: $DOCKER_REGISTRY/$NAMESPACE-migration:$IMAGE_TAG
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        command: ["npm", "run", "migrate"]
      restartPolicy: Never
  backoffLimit: 3
EOF
    
    # Wait for migration to complete
    local job_name="migration-$(date +%s)"
    kubectl wait --for=condition=complete job/$job_name -n "$NAMESPACE" --timeout=300s
    
    if kubectl get job/$job_name -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q "True"; then
        log_success "Database migration completed successfully"
        kubectl delete job/$job_name -n "$NAMESPACE"
    else
        log_error "Database migration failed"
        kubectl logs job/$job_name -n "$NAMESPACE"
        exit 1
    fi
}

# Deploy to inactive environment
deploy_to_inactive() {
    local inactive_deployment="$(get_inactive_deployment)"
    log_info "Deploying to inactive environment: $inactive_deployment"
    
    # Update Helm chart values for inactive deployment
    cat > "/tmp/values-${inactive_deployment}.yaml" <<EOF
nameOverride: "$NAMESPACE-$inactive_deployment"
fullnameOverride: "$NAMESPACE-$inactive_deployment"
image:
  tag: "$IMAGE_TAG"
replicaCount: $REPLICA_COUNT
service:
  enabled: false  # Don't expose service yet
ingress:
  enabled: false  # Don't enable ingress yet
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
env:
  NODE_ENV: "production"
  DATABASE_URL:
    valueFrom:
      secretKeyRef:
        name: database-secret
        key: url
labels:
  version: "$inactive_deployment"
  deployment: "blue-green"
EOF
    
    # Deploy using Helm
    helm upgrade --install \
        "$NAMESPACE-$inactive_deployment" \
        "$DEPLOYMENT_DIR/kubernetes/helm-chart" \
        -f "/tmp/values-${inactive_deployment}.yaml" \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout=10m
    
    log_success "Deployment to $inactive_deployment environment completed"
}

# Test inactive deployment
test_inactive_deployment() {
    local inactive_deployment="$(get_inactive_deployment)"
    log_info "Testing inactive deployment: $inactive_deployment"
    
    # Port forward to test the deployment
    kubectl port-forward "deployment/$NAMESPACE-$inactive_deployment" 8080:3000 -n "$NAMESPACE" &
    local port_forward_pid=$!
    
    sleep 5
    
    # Run health checks
    if health_check "http://localhost:8080" 60; then
        log_success "Inactive deployment health check passed"
    else
        kill $port_forward_pid 2>/dev/null || true
        log_error "Inactive deployment health check failed"
        return 1
    fi
    
    # Run integration tests
    if [ -f "$SCRIPT_DIR/integration-tests.sh" ]; then
        log_info "Running integration tests..."
        if bash "$SCRIPT_DIR/integration-tests.sh" "http://localhost:8080"; then
            log_success "Integration tests passed"
        else
            kill $port_forward_pid 2>/dev/null || true
            log_error "Integration tests failed"
            return 1
        fi
    fi
    
    kill $port_forward_pid 2>/dev/null || true
    log_success "Inactive deployment testing completed"
}

# Switch traffic to new deployment
switch_traffic() {
    local inactive_deployment="$(get_inactive_deployment)"
    local active_deployment="$(get_active_deployment)"
    
    log_info "Switching traffic from $active_deployment to $inactive_deployment"
    
    # Update service selector to point to new deployment
    kubectl patch service "$NAMESPACE-service" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$inactive_deployment\"}}}"
    
    # Update ingress if needed
    if kubectl get ingress "$NAMESPACE-ingress" -n "$NAMESPACE" &> /dev/null; then
        kubectl patch ingress "$NAMESPACE-ingress" -n "$NAMESPACE" -p "{\"spec\":{\"rules\":[{\"host\":\"api.shell-platform.com\",\"http\":{\"paths\":[{\"path\":\"/\",\"pathType\":\"Prefix\",\"backend\":{\"service\":{\"name\":\"$NAMESPACE-$inactive_deployment\",\"port\":{\"number\":80}}}}]}}]}}"
    fi
    
    # Gradually switch traffic if using service mesh
    if command -v istioctl &> /dev/null; then
        log_info "Gradually switching traffic using Istio..."
        
        # 10% traffic to new version
        kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: $NAMESPACE-vs
  namespace: $NAMESPACE
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: $NAMESPACE-service
        subset: $inactive_deployment
      weight: 100
  - route:
    - destination:
        host: $NAMESPACE-service
        subset: $active_deployment
      weight: 90
    - destination:
        host: $NAMESPACE-service
        subset: $inactive_deployment
      weight: 10
EOF
        
        sleep 30
        
        # 50% traffic
        kubectl patch virtualservice "$NAMESPACE-vs" -n "$NAMESPACE" --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$NAMESPACE'-service","subset":"'$active_deployment'"},"weight":50},{"destination":{"host":"'$NAMESPACE'-service","subset":"'$inactive_deployment'"},"weight":50}]}]}}'
        
        sleep 30
        
        # 100% traffic to new version
        kubectl patch virtualservice "$NAMESPACE-vs" -n "$NAMESPACE" --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$NAMESPACE'-service","subset":"'$inactive_deployment'"},"weight":100}]}]}}'
    fi
    
    log_success "Traffic switched to $inactive_deployment"
    
    # Verify the switch worked
    sleep 10
    if health_check "https://api.shell-platform.com" 60; then
        log_success "Traffic switch verified successfully"
        return 0
    else
        log_error "Traffic switch verification failed"
        return 1
    fi
}

# Monitor deployment
monitor_deployment() {
    local inactive_deployment="$(get_inactive_deployment)"
    log_info "Monitoring new deployment for 5 minutes..."
    
    local start_time=$(date +%s)
    local monitor_duration=300  # 5 minutes
    
    while [ $(($(date +%s) - start_time)) -lt $monitor_duration ]; do
        # Check error rate
        local error_rate=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\",version=\"$inactive_deployment\"}[5m])" | jq -r '.data.result[0].value[1] // 0')
        
        if (( $(echo "$error_rate > 0.05" | bc -l) )); then
            log_error "High error rate detected: $error_rate"
            return 1
        fi
        
        # Check response time
        local response_time=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{version=\"$inactive_deployment\"}[5m]))" | jq -r '.data.result[0].value[1] // 0')
        
        if (( $(echo "$response_time > 2" | bc -l) )); then
            log_error "High response time detected: $response_time seconds"
            return 1
        fi
        
        log_info "Monitoring... Error rate: $error_rate, Response time: $response_time"
        sleep 30
    done
    
    log_success "Monitoring completed - deployment is stable"
    return 0
}

# Rollback function
rollback() {
    local current_active="$(get_active_deployment)"
    local rollback_to
    
    if [ "$current_active" = "$BLUE_SUFFIX" ]; then
        rollback_to="$GREEN_SUFFIX"
    else
        rollback_to="$BLUE_SUFFIX"
    fi
    
    log_warn "Rolling back from $current_active to $rollback_to"
    send_notification "🔄 Rollback initiated from $current_active to $rollback_to" "warning"
    
    # Switch traffic back
    kubectl patch service "$NAMESPACE-service" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$rollback_to\"}}}"
    
    # Verify rollback
    if health_check "https://api.shell-platform.com" 60; then
        log_success "Rollback completed successfully"
        send_notification "✅ Rollback completed successfully to $rollback_to" "good"
        return 0
    else
        log_error "Rollback failed"
        send_notification "❌ Rollback failed - manual intervention required" "error"
        return 1
    fi
}

# Cleanup old deployment
cleanup_old_deployment() {
    local active_deployment="$(get_active_deployment)"
    local old_deployment
    
    if [ "$active_deployment" = "$BLUE_SUFFIX" ]; then
        old_deployment="$GREEN_SUFFIX"
    else
        old_deployment="$BLUE_SUFFIX"
    fi
    
    log_info "Scaling down old deployment: $old_deployment"
    
    # Scale down old deployment
    kubectl scale deployment "$NAMESPACE-$old_deployment" --replicas=0 -n "$NAMESPACE"
    
    # Optionally delete old deployment (keep for quick rollback)
    # kubectl delete deployment "$NAMESPACE-$old_deployment" -n "$NAMESPACE"
    
    log_success "Old deployment cleanup completed"
}

# Main deployment function
main() {
    local image_tag="${1:-latest}"
    IMAGE_TAG="$image_tag"
    
    # Create necessary directories
    mkdir -p "$LOGS_DIR" "$BACKUP_DIR"
    
    log_info "Starting blue-green deployment for Shell Platform"
    log_info "Image tag: $IMAGE_TAG"
    
    send_notification "🚀 Starting blue-green deployment with tag: $IMAGE_TAG" "good"
    
    # Backup current state
    "$SCRIPT_DIR/backup.sh" pre-deployment
    
    trap 'log_error "Deployment failed - check logs"; send_notification "❌ Deployment failed - check logs" "error"' ERR
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Run database migrations if needed
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        run_migrations
    fi
    
    # Deploy to inactive environment
    deploy_to_inactive
    
    # Test the inactive deployment
    if ! test_inactive_deployment; then
        log_error "Inactive deployment testing failed - aborting"
        exit 1
    fi
    
    # Switch traffic
    if ! switch_traffic; then
        log_error "Traffic switch failed - attempting rollback"
        rollback
        exit 1
    fi
    
    # Monitor the deployment
    if ! monitor_deployment; then
        log_error "Deployment monitoring failed - attempting rollback"
        rollback
        exit 1
    fi
    
    # Cleanup old deployment
    cleanup_old_deployment
    
    log_success "Blue-green deployment completed successfully"
    send_notification "✅ Blue-green deployment completed successfully" "good"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi