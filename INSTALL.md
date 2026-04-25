# Installation Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Setup

### 1. Install Composer dependencies

Sail is not yet available, so use Docker directly for the first install:

```bash
docker run --rm --user=0 --entrypoint="" \
  -v "$(pwd)":/var/www/html -w /var/www/html \
  sail-8.5/app:latest /usr/bin/composer install --no-interaction
```

### 2. Configure environment

```bash
cp .env.example .env
```

**To change the port**, edit `APP_PORT` in `.env` before starting Sail:

```dotenv
APP_PORT=8000   # change this to any available port
```

> **Note:** Start Sail only after `.env` is configured. If Sail is already running, restart it with `vendor/bin/sail down && vendor/bin/sail up -d` to apply port changes.

### 3. Start Sail

```bash
vendor/bin/sail up -d
```

### 4. Generate application key

```bash
vendor/bin/sail artisan key:generate
```

### 5. Create the database

```bash
touch database/database.sqlite
```

### 6. Run migrations and seed

```bash
vendor/bin/sail artisan migrate:fresh --seed --force
```

### 7. Link storage

```bash
vendor/bin/sail artisan storage:link
```

### 8. Install frontend dependencies and start Vite

```bash
vendor/bin/sail npm install
vendor/bin/sail npm run dev
```

## Accessing the application

Open `http://localhost:8000` (or the port set in `APP_PORT`).

Default login credentials from the seeder:

| Field    | Value              |
|----------|--------------------|
| Email    | test@example.com   |
| Password | password           |

## Stopping Sail

```bash
vendor/bin/sail stop
```
