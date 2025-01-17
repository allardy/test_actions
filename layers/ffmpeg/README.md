This layer contains binaries and large libraries used in a bot. The latest version of the layer is always used when a bot is published.

docker create --name temp-container 347d6490ec2c

docker cp temp-container:/opt/nodejs a:/dev/hq3/repos/skynet/layers/bot-layer/dist
docker rm temp-container

docker run --rm -v "./dist:/layer" $IMAGE_TAG

docker build -t ffmpeg1 .
docker run --rm -v "a:/dev/integration-layers/packages/layers/ffmpeg/dist:/layer" ffmpeg1

### Test integration

set SECRET_BOTPRESS_BOT_ID=abc
set SECRET_BOTPRESS_TOKEN=abc
set SECRET_OPENAI_API_KEY=abc
