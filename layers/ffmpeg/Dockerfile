FROM public.ecr.aws/lambda/nodejs:20

RUN dnf update -y && \
  dnf install -y \
  tar \
  gzip \
  xz \
  make \
  gcc-c++ \
  python3 \
  zip \
  openssl-devel && dnf clean all

RUN npm install -g pnpm

COPY ./package.json /opt/nodejs/package.json
COPY ./pnpm-lock.yaml /opt/nodejs/pnpm-lock.yaml

WORKDIR /opt/nodejs

RUN pnpm install --prod

RUN mkdir -p /opt/bin && \
  curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ --strip-components=1 -C /opt/bin && \
  chmod +x /opt/bin/ffmpeg

# So it can find ffmpeg
ENV PATH="/opt/bin:$PATH"

# Zip the nodejs directory (structure is important)
RUN cd /opt && zip -r integration-layer.zip nodejs bin

# Define the output directory
VOLUME /layer

# Necessary for the lambda image
ENTRYPOINT []

# Copy the zip file to the output directory
CMD cp /opt/layer.zip /layer
