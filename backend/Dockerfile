FROM gcc:14-bookworm AS build
WORKDIR /app
COPY vendor/ vendor/
COPY src/ src/
RUN g++ -std=c++17 -O2 -pthread -static-libstdc++ -static-libgcc -I vendor src/main.cpp -o qbudget-api

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/qbudget-api /app/qbudget-api
USER 10001:10001
ENV PORT=8080
EXPOSE 8080
CMD ["/app/qbudget-api"]
