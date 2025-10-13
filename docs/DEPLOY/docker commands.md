# build acelerado do frontend (script que já faz build e push no dockerhub):

./scripts/build-frontend.sh 1.0.0

# Build do backend

docker build -f apps/backend/Dockerfile.prod -t felipebatista54/telemetria-backend:1.0.7 -t felipebatista54/telemetria-backend:latest --no-cache .
docker push felipebatista54/telemetria-backend:1.0.7
docker push felipebatista54/telemetria-backend:latest

# no servidor:

- Baixar as imagens:
  docker pull felipebatista54/telemetria-backend:latest
  docker pull felipebatista54/telemetria-frontend:latest
- Derrubar os containers:
  docker compose -f docker-compose.prod.yml --env-file .env.production down
- Subir os containers:
  docker compose -f docker-compose.prod.yml --env-file .env.production up -d
