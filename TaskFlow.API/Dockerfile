FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Proje dosyasını kopyala ve bağımlılıkları yükle
COPY ["TaskFlow.API.csproj", "./"]
RUN dotnet restore "TaskFlow.API.csproj"

# Tüm kodları kopyala ve projeyi canlıya hazır (Release) hale getir
COPY . .
RUN dotnet publish "TaskFlow.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Sadece çalışması için gereken hafif ortamı (Runtime) ayarla
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TaskFlow.API.dll"]