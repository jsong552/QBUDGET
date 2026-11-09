FROM gcc:14-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4-openssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY vendor/ vendor/
COPY src/ src/
RUN g++ -std=c++17 -O2 -pthread -static-libstdc++ -static-libgcc -I vendor src/main.cpp -o qbudget-api -lcurl

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/qbudget-api /app/qbudget-api
USER 10001:10001
ENV PORT=8080
EXPOSE 8080
CMD ["/app/qbudget-api"]
