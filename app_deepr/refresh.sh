docker build --build-arg DB_USERNAME=tomdb --build-arg DB_PASSWORD=tompassword -t speak-appserver .
docker rm -f app
docker run -d --network tom-network --name app -e DB_USERNAME=tomdb -e DB_PASSWORD=tompassword -p 3111:3111 speak-appserver