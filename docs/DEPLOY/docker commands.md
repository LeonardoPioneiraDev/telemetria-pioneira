# build acelerado do frontend (script que já faz build e push no dockerhub):

./scripts/build-frontend.sh 1.0.0

# Build do backend

docker build -f apps/backend/Dockerfile.prod -t felipebatista54/telemetria-backend:1.0.6 -t felipebatista54/telemetria-backend:latest --no-cache .
docker push felipebatista54/telemetria-backend:1.0.6
docker push felipebatista54/telemetria-backend:latest
