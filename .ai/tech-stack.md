# Tech Stack

## Środowisko uruchomieniowe

- Node wersja v22
- Manager paczek: pnpm

## Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI
- React Hook Form jako biblioteka formularzy

## Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

## Autuentykacja - Supabase Auth

- Supabase Auth umożliwia bezpieczną rejestrację i logowanie użytkowników
- Obsługuje zarządzanie kontem użytkownika, w tym resetowanie hasła oraz aktualizację danych profilu
- Umożliwia integrację z zewnętrznymi dostawcami tożsamości (np. Google, GitHub)
- Prosty w integracji z frontendem dzięki dostarczanym SDK
- Zapewnia przechowywanie sesji i automatyczną odnowę tokenów

## CI/CD i Hosting:

- Github Actions do tworzenia pipeline’ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
