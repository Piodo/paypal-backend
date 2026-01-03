type nul > Dockerfile
echo FROM gradle:7.6-jdk-17-alpine AS builder >> Dockerfile
echo WORKDIR /app >> Dockerfile
echo COPY build.gradle settings.gradle ./ >> Dockerfile
echo COPY gradle/wrapper ./gradle/wrapper >> Dockerfile
echo RUN gradle dependencies --no-daemon >> Dockerfile
echo COPY src ./src >> Dockerfile
echo RUN gradle clean build -x test --no-daemon >> Dockerfile
echo. >> Dockerfile
echo FROM openjdk:17-jre-slim >> Dockerfile
echo WORKDIR /app >> Dockerfile
echo COPY --from=builder /app/build/libs/*.jar app.jar >> Dockerfile
echo EXPOSE 8080 >> Dockerfile
echo CMD ["java", "-jar", "app.jar"] >> Dockerfile