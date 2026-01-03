FROM gradle:7.6.4-jdk17-alpine AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle/wrapper ./gradle/wrapper
RUN gradle dependencies --no-daemon
COPY src ./src
RUN gradle clean build -x test --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]