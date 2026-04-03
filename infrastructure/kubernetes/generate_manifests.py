#!/usr/bin/env python3
"""
Kubernetes manifests for Lumosity platform
Production-grade orchestration with horizontal scaling
"""

# api-deployment.yaml
api_deployment = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lumosity-api
  labels:
    app: lumosity-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lumosity-api
  template:
    metadata:
      labels:
        app: lumosity-api
    spec:
      containers:
      - name: api
        image: lumosity/api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: lumosity-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: lumosity-secrets
              key: redis-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: lumosity-secrets
              key: secret-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: lumosity-api-service
spec:
  selector:
    app: lumosity-api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lumosity-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lumosity-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
"""

# frontend-deployment.yaml
frontend_deployment = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lumosity-frontend
  labels:
    app: lumosity-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lumosity-frontend
  template:
    metadata:
      labels:
        app: lumosity-frontend
    spec:
      containers:
      - name: frontend
        image: lumosity/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: lumosity-frontend-service
spec:
  selector:
    app: lumosity-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
"""

# postgres-statefulset.yaml
postgres_statefulset = """
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: lumosity-postgres
spec:
  serviceName: lumosity-postgres
  replicas: 1
  selector:
    matchLabels:
      app: lumosity-postgres
  template:
    metadata:
      labels:
        app: lumosity-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: lumosity-secrets
              key: postgres-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: lumosity-secrets
              key: postgres-password
        - name: POSTGRES_DB
          value: lumosity
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
"""

# redis-deployment.yaml
redis_deployment = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lumosity-redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lumosity-redis
  template:
    metadata:
      labels:
        app: lumosity-redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: lumosity-redis
spec:
  selector:
    app: lumosity-redis
  ports:
  - port: 6379
    targetPort: 6379
"""

# ingress.yaml
ingress_config = """
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lumosity-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.lumosity.com
    - app.lumosity.com
    secretName: lumosity-tls
  rules:
  - host: api.lumosity.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lumosity-api-service
            port:
              number: 80
  - host: app.lumosity.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lumosity-frontend-service
            port:
              number: 80
"""

# monitoring/prometheus-config.yaml
prometheus_config = """
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
"""

if __name__ == "__main__":
    import os
    
    output_dir = "c:\\Users\\x-noo\\OneDrive\\Desktop\\lumosity-clone\\infrastructure\\kubernetes"
    os.makedirs(output_dir, exist_ok=True)
    
    files = {
        "api-deployment.yaml": api_deployment,
        "frontend-deployment.yaml": frontend_deployment,
        "postgres-statefulset.yaml": postgres_statefulset,
        "redis-deployment.yaml": redis_deployment,
        "ingress.yaml": ingress_config,
        "prometheus-config.yaml": prometheus_config,
    }
    
    for filename, content in files.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w') as f:
            f.write(content)
    
    print(f"Kubernetes manifests created in {output_dir}")
    print(f"Files: {', '.join(files.keys())}")
