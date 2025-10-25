# Specyfikacja Techniczna Systemu Uwierzytelniania

## Ski Surface Spec Extension

**Wersja dokumentu:** 1.1
**Data utworzenia:** 2025-10-20
**Data aktualizacji:** 2025-10-21
**Autor:** Specyfikacja techniczna dla systemu rejestracji, logowania i odzyskiwania hasła

---

## 1. ARCHITEKTURA WARSTWY INTERFEJSU UŻYTKOWNIKA (UI)

### 1.1 Przegląd zmian w strukturze stron

System uwierzytelniania wprowadza nowe strony oraz modyfikuje istniejące elementy aplikacji. Poniżej szczegółowa struktura zmian:

#### 1.1.1 Nowe strony publiczne (dostępne bez uwierzytelnienia)

**A. Strona logowania: `/auth/login`**

- **Ścieżka pliku:** `src/pages/auth/login.astro`
- **Typ:** Strona Astro z wyspą React dla formularza
- **Dostępność:** Publiczna (whitelist w middleware)
- **Layout:** `Layout.astro` z uproszczonym nagłówkiem (bez pełnego menu)
- **Główne komponenty:**
  - `LoginForm` (React island) - formularz logowania
  - Link do strony rejestracji
  - Link do resetowania hasła
- **Logika przekierowań:**
  - Niezalogowany użytkownik → wyświetla formularz
  - Zalogowany użytkownik → automatyczne przekierowanie do `/ski-specs`
  - Po udanym logowaniu → przekierowanie do `redirectTo` (z URL) lub `/ski-specs` (domyślnie)
- **Parametry URL:**
  - `redirectTo` (opcjonalny) - URL do przekierowania po zalogowaniu
  - `error` (opcjonalny) - kod błędu do wyświetlenia (np. `session_expired`)

**B. Strona rejestracji: `/auth/register`**

- **Ścieżka pliku:** `src/pages/auth/register.astro`
- **Typ:** Strona Astro z wyspą React dla formularza
- **Dostępność:** Publiczna (whitelist w middleware)
- **Layout:** `Layout.astro` z uproszczonym nagłówkiem
- **Główne komponenty:**
  - `RegisterForm` (React island) - formularz rejestracji
  - Link do strony logowania
- **Logika przekierowań:**
  - Niezalogowany użytkownik → wyświetla formularz
  - Zalogowany użytkownik → automatyczne przekierowanie do `/ski-specs`
  - Po udanej rejestracji → automatyczne logowanie + przekierowanie do `/ski-specs`
- **Parametry URL:** brak

**C. Strona resetowania hasła: `/auth/reset-password`**

- **Ścieżka pliku:** `src/pages/auth/reset-password.astro`
- **Typ:** Strona Astro z wyspą React dla formularza
- **Dostępność:** Publiczna (whitelist w middleware)
- **Layout:** `Layout.astro` z uproszczonym nagłówkiem
- **Główne komponenty:**
  - `ResetPasswordForm` (React island) - formularz żądania resetu hasła (email)
- **Logika:**
  - Użytkownik wprowadza email
  - System wysyła link resetujący przez Supabase Auth
  - Wyświetlenie komunikatu o wysłaniu emaila
- **Parametry URL:** brak

**D. Strona ustawiania nowego hasła: `/auth/update-password`**

- **Ścieżka pliku:** `src/pages/auth/update-password.astro`
- **Typ:** Strona Astro z wyspą React dla formularza
- **Dostępność:** Dostępna przez link z emaila (z tokenem)
- **Layout:** `Layout.astro` z uproszczonym nagłówkiem
- **Główne komponenty:**
  - `UpdatePasswordForm` (React island) - formularz nowego hasła
- **Logika:**
  - Weryfikacja tokenu z URL (hash fragment lub query param)
  - Formularz wprowadzenia nowego hasła z potwierdzeniem
  - Walidacja wymogów hasła
  - Po udanej zmianie → przekierowanie do `/auth/login` z komunikatem sukcesu
- **Parametry URL:**
  - `access_token` i `refresh_token` (w hash fragment) - tokeny z Supabase

#### 1.1.2 Modyfikacje istniejących stron

**A. Landing Page: `/`**

- **Ścieżka pliku:** `src/pages/index.astro` (istniejący)
- **Zmiany:**
  - **PRZED:** Przyciski "Get Started" i "Create Account" prowadzą do `/ski-specs`
  - **PO:**
    - Primary CTA "Zarejestruj się" / "Rozpocznij" → `/auth/register`
    - Secondary CTA "Masz już konto? Zaloguj się" → `/auth/login`
    - Dla zalogowanych użytkowników: zmiana CTA na "Przejdź do specyfikacji" → `/ski-specs`
- **Logika:**
  - Dostępna dla wszystkich (zalogowanych i niezalogowanych)
  - **WAŻNE:** Zalogowani użytkownicy mogą pozostać na landing page (nie ma auto-redirect)
  - Dynamiczne CTA w zależności od stanu autentykacji

**B. Strona listy specyfikacji: `/ski-specs`**

- **Ścieżka pliku:** `src/pages/ski-specs.astro` (istniejący)
- **Zmiany:**
  - Brak zmian w strukturze strony
  - Wykorzystuje już `userId` z `context.locals` (obecnie mock, po zmianach będzie rzeczywisty)

### 1.2 Nowe komponenty React

#### 1.2.1 Komponenty formularzy uwierzytelniania

**A. LoginForm.tsx**

- **Ścieżka:** `src/components/auth/LoginForm.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Prezentacja i walidacja formularza logowania
  - Obsługa interakcji użytkownika
  - Komunikacja z Supabase Auth przez klienta po stronie przeglądarki
  - Wyświetlanie błędów walidacji i błędów uwierzytelniania
  - Zarządzanie stanem ładowania (loading state)
- **Pola formularza:**
  - Email (type="email", required, walidacja formatu)
  - Hasło (type="password", required, min 6 znaków)
  - "Zapamiętaj mnie" (checkbox, opcjonalny)
- **Akcje:**
  - Przycisk "Zaloguj się" (primary)
  - Link "Zapomniałem hasła" → `/auth/reset-password`
  - Link "Nie masz konta? Zarejestruj się" → `/auth/register`
- **Walidacja:**
  - React Hook Form + Zod schema
  - Walidacja po stronie klienta przed wysłaniem
  - Wyświetlanie błędów inline przy polach
- **Obsługa błędów:**
  - Błędy walidacji → wyświetlanie przy polach
  - Błędne dane logowania → komunikat generyczny "Nieprawidłowy email lub hasło"
  - Błędy sieciowe → toast z możliwością ponowienia
  - Przekroczenie limitu prób → komunikat o zablokowaniu konta
- **Integracja z Supabase:**
  - Wykorzystuje `@supabase/supabase-js` po stronie klienta
  - Wywołanie `supabase.auth.signInWithPassword({ email, password })`
  - Po sukcesie: przekierowanie przez `window.location.href` (wymusza pełne przeładowanie + odświeżenie middleware)
- **Schema Zod:**

```typescript
const LoginSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
  rememberMe: z.boolean().optional(),
});
```

**B. RegisterForm.tsx**

- **Ścieżka:** `src/components/auth/RegisterForm.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Prezentacja i walidacja formularza rejestracji
  - Obsługa interakcji użytkownika
  - Komunikacja z Supabase Auth
  - Walidacja siły hasła w czasie rzeczywistym
  - Wyświetlanie błędów walidacji
- **Pola formularza:**
  - Email (type="email", required, walidacja formatu)
  - Hasło (type="password", required, min 8 znaków, wymogi bezpieczeństwa)
  - Potwierdzenie hasła (type="password", required, musi być identyczne)
  - Akceptacja regulaminu (checkbox, required)
- **Akcje:**
  - Przycisk "Zarejestruj się" (primary)
  - Link "Masz już konto? Zaloguj się" → `/auth/login`
- **Walidacja:**
  - React Hook Form + Zod schema
  - Wymogi hasła:
    - Minimum 8 znaków
    - Przynajmniej jedna wielka litera
    - Przynajmniej jedna mała litera
    - Przynajmniej jedna cyfra
    - Opcjonalnie: znak specjalny
  - Wizualizacja siły hasła (password strength indicator)
  - Sprawdzenie zgodności hasła i potwierdzenia
- **Obsługa błędów:**
  - Błędy walidacji → inline przy polach
  - Email już istnieje → komunikat "Ten adres email jest już zarejestrowany"
  - Błędy sieciowe → toast
- **Integracja z Supabase:**
  - `supabase.auth.signUp({ email, password })`
  - Po sukcesie: automatyczne logowanie (Supabase robi to domyślnie)
  - Przekierowanie do `/ski-specs`
  - Opcjonalnie: weryfikacja emaila (jeśli włączona w Supabase)
- **Schema Zod:**

```typescript
const RegisterSchema = z
  .object({
    email: z.string().email('Nieprawidłowy format adresu email'),
    password: z
      .string()
      .min(8, 'Hasło musi mieć minimum 8 znaków')
      .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
      .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
      .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, 'Musisz zaakceptować regulamin'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  });
```

**C. ResetPasswordForm.tsx**

- **Ścieżka:** `src/components/auth/ResetPasswordForm.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Formularz żądania resetu hasła (wprowadzenie emaila)
  - Komunikacja z Supabase Auth
  - Wyświetlanie komunikatu o wysłaniu emaila
- **Pola formularza:**
  - Email (type="email", required)
- **Akcje:**
  - Przycisk "Wyślij link resetujący"
  - Link "Powrót do logowania" → `/auth/login`
- **Logika:**
  - Po wprowadzeniu emaila wywołuje `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://domain.com/auth/update-password' })`
  - Wyświetlenie komunikatu sukcesu (nawet jeśli email nie istnieje w systemie - security best practice)
  - Informacja o sprawdzeniu skrzynki email
- **Schema Zod:**

```typescript
const ResetPasswordSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
});
```

**D. UpdatePasswordForm.tsx**

- **Ścieżka:** `src/components/auth/UpdatePasswordForm.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Formularz ustawienia nowego hasła
  - Walidacja siły hasła
  - Weryfikacja tokenu z URL
  - Aktualizacja hasła przez Supabase Auth
- **Pola formularza:**
  - Nowe hasło (type="password", required, wymogi bezpieczeństwa)
  - Potwierdzenie nowego hasła (type="password", required)
- **Akcje:**
  - Przycisk "Ustaw nowe hasło"
- **Logika:**
  - Weryfikacja tokenu z URL (automatycznie przez Supabase przy montowaniu)
  - Jeśli token nieprawidłowy/wygasły → komunikat błędu + link do `/auth/reset-password`
  - Po wprowadzeniu nowego hasła: `supabase.auth.updateUser({ password: newPassword })`
  - Po sukcesie → przekierowanie do `/auth/login` z toastem "Hasło zostało zmienione"
- **Schema Zod:**

```typescript
const UpdatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Hasło musi mieć minimum 8 znaków')
      .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
      .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
      .regex(/[0-9]/, 'Hasło musi zawierać cyfrę'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  });
```

#### 1.2.2 Komponenty nawigacji i layoutu

**A. Navigation.tsx (MODYFIKACJA)**

- **Ścieżka:** `src/components/Navigation.tsx` (istniejący)
- **Zmiany:**
  - Dodanie logiki dynamicznej widoczności elementów menu w zależności od stanu autentykacji
  - Dodanie `UserMenu` (dropdown z avatarem) dla zalogowanych użytkowników
- **Nowa struktura:**

```typescript
// Stan niezalogowany:
const unauthenticatedItems = [{ label: 'Home', href: '/' }];

// Stan zalogowany:
const authenticatedItems = [
  { label: 'Home', href: '/' },
  { label: 'Ski Specs', href: '/ski-specs' },
];
```

- **Logika:**
  - Odczyt stanu autentykacji z Supabase Auth context (custom hook `useAuth`)
  - Warunkowe renderowanie elementów menu
  - Dla zalogowanych: wyświetlenie `UserMenu` po prawej stronie
  - Dla niezalogowanych: wyświetlenie przycisków "Zaloguj się" → `/auth/login` i "Zarejestruj się" → `/auth/register`

**B. UserMenu.tsx (NOWY)**

- **Ścieżka:** `src/components/auth/UserMenu.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Wyświetlanie menu użytkownika (dropdown)
  - Obsługa akcji wylogowania
  - Wyświetlanie podstawowych informacji użytkownika
- **Struktura:**
  - Trigger: Avatar użytkownika + email (inicjały z emaila lub ikona domyślna)
  - Dropdown content:
    - Przycisk "Wyloguj" → akcja wylogowania
- **Akcja wylogowania:**
  - Wywołanie `supabase.auth.signOut()`
  - Po sukcesie: przekierowanie do `/` (landing page)
  - Wyświetlenie toastu "Zostałeś wylogowany"
- **Komponenty shadcn/ui:**
  - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`
  - `Avatar`, `AvatarImage`, `AvatarFallback`

**C. Header.astro (MODYFIKACJA)**

- **Ścieżka:** `src/components/Header.astro` (istniejący)
- **Zmiany:**
  - Dodanie warunkowego renderowania dla zalogowanych/niezalogowanych użytkowników
  - Przekazanie informacji o stanie autentykacji do komponentu Navigation
- **Nowa struktura:**

```astro
---
// Odczyt sesji z context.locals.session (dodany w middleware)
const session = Astro.locals.session;
const isAuthenticated = !!session;
---

<header>
  <div class="container">
    <div class="flex items-center gap-6">
      <Logo />
      <Navigation currentPath={currentPath} isAuthenticated={isAuthenticated} client:load />
    </div>
    {isAuthenticated && <UserMenu userEmail={session.user.email} client:load />}
    {
      !isAuthenticated && (
        <>
          <Button asChild>
            <a href="/auth/login">Zaloguj się</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/auth/register">Zarejestruj się</a>
          </Button>
        </>
      )
    }
  </div>
</header>
```

#### 1.2.3 Komponenty pomocnicze

**A. AuthGuard.tsx (NOWY)**

- **Ścieżka:** `src/components/auth/AuthGuard.tsx`
- **Typ:** React Functional Component (wrapper)
- **Odpowiedzialności:**
  - Przechwytywanie błędów 401 z API
  - Przekierowanie do `/auth/login?redirectTo=...` przy braku autoryzacji
  - Obsługa wygasłej sesji
- **Implementacja:**
  - HOC lub wrapper dla fetch/axios
  - Interceptor dodający Bearer token do requestów
  - Interceptor odpowiedzi przechwytujący 401
- **Logika:**

```typescript
const handleUnauthorized = (originalUrl: string) => {
  const redirectTo = encodeURIComponent(originalUrl);
  window.location.href = `/auth/login?redirectTo=${redirectTo}`;
};
```

**B. PasswordStrengthIndicator.tsx (NOWY)**

- **Ścieżka:** `src/components/auth/PasswordStrengthIndicator.tsx`
- **Typ:** React Functional Component
- **Odpowiedzialności:**
  - Wizualizacja siły hasła w czasie rzeczywistym
  - Wyświetlanie wymogów hasła (checklist)
- **Props:**
  - `password: string` - aktualna wartość hasła
- **Wyświetlanie:**
  - Pasek postępu (0-100%) z kolorami: czerwony, pomarańczowy, żółty, zielony
  - Checklist wymogów:
    - ✓/✗ Minimum 8 znaków
    - ✓/✗ Wielka litera
    - ✓/✗ Mała litera
    - ✓/✗ Cyfra
- **Algorytm siły:**

```typescript
const calculateStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  return strength;
};
```

### 1.3 Custom Hooks React

**A. useAuth.ts**

- **Ścieżka:** `src/components/hooks/useAuth.ts`
- **Odpowiedzialności:**
  - Zarządzanie stanem autentykacji po stronie klienta
  - Subskrypcja zmian sesji Supabase
  - Udostępnienie informacji o użytkowniku
- **Interfejs:**

```typescript
interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const useAuth = (): UseAuthReturn => {
  // implementacja
};
```

- **Implementacja:**
  - Wykorzystanie `supabase.auth.getSession()` przy montowaniu
  - Subskrypcja `supabase.auth.onAuthStateChange()` dla reaktywności
  - Cleanup subskrypcji przy unmount

**B. useSupabaseClient.ts**

- **Ścieżka:** `src/components/hooks/useSupabaseClient.ts`
- **Odpowiedzialności:**
  - Udostępnienie klienta Supabase dla komponentów React
  - Zapewnienie poprawnej konfiguracji klienta
- **Implementacja:**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

export const useSupabaseClient = () => {
  const supabase = useMemo(
    () => createClient<Database>(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_KEY),
    []
  );

  return supabase;
};
```

### 1.4 Walidacja i komunikaty błędów

#### 1.4.1 Typy błędów i mapowanie

**A. Błędy walidacji formularzy**

- **Email:**
  - Puste pole: "Adres email jest wymagany"
  - Nieprawidłowy format: "Nieprawidłowy format adresu email"
- **Hasło (logowanie):**
  - Puste pole: "Hasło jest wymagane"
  - Za krótkie: "Hasło musi mieć minimum 6 znaków"
- **Hasło (rejestracja):**
  - Puste pole: "Hasło jest wymagane"
  - Za krótkie: "Hasło musi mieć minimum 8 znaków"
  - Brak wielkiej litery: "Hasło musi zawierać przynajmniej jedną wielką literę"
  - Brak małej litery: "Hasło musi zawierać przynajmniej jedną małą literę"
  - Brak cyfry: "Hasło musi zawierać przynajmniej jedną cyfrę"
- **Potwierdzenie hasła:**
  - Niezgodność: "Hasła nie są identyczne"
- **Regulamin:**
  - Brak akceptacji: "Musisz zaakceptować regulamin, aby kontynuować"

**B. Błędy uwierzytelniania Supabase**

Mapowanie kodów błędów Supabase Auth na przyjazne komunikaty:

```typescript
const authErrorMessages: Record<string, string> = {
  invalid_credentials: 'Nieprawidłowy email lub hasło',
  email_not_confirmed: 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.',
  user_already_exists: 'Ten adres email jest już zarejestrowany',
  weak_password: 'Hasło jest zbyt słabe. Użyj silniejszego hasła.',
  over_email_send_rate_limit: 'Zbyt wiele prób wysłania emaila. Spróbuj ponownie później.',
  invalid_grant: 'Link resetujący hasło wygasł lub jest nieprawidłowy',
  refresh_token_not_found: 'Sesja wygasła. Zaloguj się ponownie.',
  // domyślny:
  default: 'Wystąpił błąd. Spróbuj ponownie.',
};
```

**C. Błędy sieciowe**

- Brak połączenia: "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie."
- Timeout: "Żądanie przekroczyło limit czasu. Spróbuj ponownie."
- 500 Internal Server Error: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."

#### 1.4.2 Strategia wyświetlania błędów

**A. Błędy inline (przy polach formularza)**

- Wyświetlane bezpośrednio pod polem z błędem
- Kolor czerwony (destructive variant)
- Ikona ostrzeżenia
- ARIA: `aria-invalid="true"` i `aria-describedby="error-id"` na polu

**B. Toasty (globalne komunikaty)**

- Używane dla:
  - Komunikatów sukcesu (np. "Hasło zostało zmienione")
  - Błędów sieciowych
  - Błędów nie związanych bezpośrednio z polem (np. "Sesja wygasła")
- Komponent: `Toaster` z shadcn/ui (sonner)
- Pozycja: top-right lub bottom-right
- Auto-dismiss: 5 sekund

**C. Alert boxes (komunikaty na stronie)**

- Używane dla:
  - Komunikat po wysłaniu emaila resetującego hasło
  - Informacja o konieczności potwierdzenia emaila
- Komponent: `Alert` z shadcn/ui
- Warianty: `default`, `success`, `warning`, `destructive`

### 1.5 Najważniejsze scenariusze użytkownika (User Flows)

#### Scenariusz 1: Pierwszy wizyta - rejestracja i pierwsze logowanie

1. Użytkownik wchodzi na landing page `/`
2. Klika "Zarejestruj się"
3. Przekierowanie do `/auth/register`
4. Wypełnia formularz: email, hasło, potwierdzenie hasła, akceptuje regulamin
5. Kliknięcie "Zarejestruj się"
6. Walidacja po stronie klienta (Zod)
7. Wywołanie `supabase.auth.signUp()`
8. Sukces → automatyczne logowanie
9. Przekierowanie do `/ski-specs`
10. Wyświetlenie toastu "Witaj! Twoje konto zostało utworzone"
11. Middleware ustawia `userId` w `context.locals`
12. Lista specyfikacji jest pusta → wyświetlenie komunikatu empty state

#### Scenariusz 2: Logowanie powracającego użytkownika

1. Użytkownik wchodzi na landing page `/` lub bezpośrednio `/ski-specs`
2. Jeśli `/ski-specs` → middleware przekierowuje do `/auth/login?redirectTo=/ski-specs`
3. Użytkownik wypełnia formularz logowania
4. Kliknięcie "Zaloguj się"
5. Walidacja + wywołanie `supabase.auth.signInWithPassword()`
6. Sukces → przekierowanie do `/ski-specs` (lub `redirectTo` z URL)
7. Middleware odczytuje sesję z cookie i ustawia `userId`
8. Strona `/ski-specs` renderuje się z danymi użytkownika

#### Scenariusz 3: Resetowanie hasła

1. Użytkownik na stronie `/auth/login` klika "Zapomniałem hasła"
2. Przekierowanie do `/auth/reset-password`
3. Wprowadza email i klika "Wyślij link resetujący"
4. Wywołanie `supabase.auth.resetPasswordForEmail()`
5. Wyświetlenie komunikatu: "Jeśli podany adres email jest w naszej bazie, otrzymasz link do resetowania hasła"
6. Użytkownik otrzymuje email z linkiem
7. Kliknięcie linku → przekierowanie do `/auth/update-password?access_token=...`
8. Wprowadza nowe hasło i potwierdzenie
9. Kliknięcie "Ustaw nowe hasło"
10. Wywołanie `supabase.auth.updateUser({ password })`
11. Sukces → przekierowanie do `/auth/login` + toast "Hasło zostało zmienione. Możesz się teraz zalogować"

#### Scenariusz 4: Wylogowanie

1. Zalogowany użytkownik klika avatar w prawym górnym rogu
2. Dropdown menu się rozwija
3. Klika "Wyloguj"
4. Wywołanie `supabase.auth.signOut()`
5. Przekierowanie do `/` (landing page)
6. Toast "Zostałeś wylogowany"
7. Header zmienia się na wersję dla niezalogowanych (przycisk "Zaloguj się")

#### Scenariusz 5: Wygaśnięcie sesji podczas pracy

1. Użytkownik pracuje na `/ski-specs`
2. Sesja wygasa (np. po 24h)
3. Próba wywołania API (np. dodanie specyfikacji)
4. API zwraca 401 Unauthorized
5. `AuthGuard` przechwytuje błąd
6. Przekierowanie do `/auth/login?redirectTo=/ski-specs&error=session_expired`
7. Wyświetlenie komunikatu "Twoja sesja wygasła. Zaloguj się ponownie"
8. Po zalogowaniu użytkownik wraca na `/ski-specs`

---

## 2. LOGIKA BACKENDU I MIDDLEWARE

### 2.1 Aktualizacja Middleware

#### 2.1.1 Zastąpienie mocka rzeczywistą autentykacją

**Plik:** `src/middleware/index.ts`

**Obecna implementacja (mock):**

```typescript
export const onRequest = defineMiddleware((context, next) => {
  context.locals.skiSpecService = new SkiSpecService(supabaseClient);
  context.locals.userId = '2be2c57e-3845-4579-9a60-c872cbfb9886'; // MOCK
  return next();
});
```

**Nowa implementacja:**

```typescript
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/db/database.types';
import { SkiSpecService } from '@/lib/services/SkiSpecService';

// Whitelist tras publicznych (nie wymagających autentykacji)
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/update-password',
  '/api/health',
  '/404',
];

// Trasy tylko dla niezalogowanych (redirect do /ski-specs jeśli zalogowany)
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register'];

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Utworzenie Server-Side Supabase Client z obsługą cookies
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      get: (key) => context.cookies.get(key)?.value,
      set: (key, value, options) => {
        context.cookies.set(key, value, options);
      },
      remove: (key, options) => {
        context.cookies.delete(key, options);
      },
    },
  });

  // 2. Odczyt sesji użytkownika
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // 3. Zapisanie sesji i supabase client w locals
  context.locals.supabase = supabase;
  context.locals.session = session;
  context.locals.userId = session?.user?.id || null;

  // 4. Inicjalizacja serwisu (tylko jeśli użytkownik zalogowany)
  if (session?.user?.id) {
    context.locals.skiSpecService = new SkiSpecService(supabase);
  }

  // 5. Obsługa przekierowań i ochrony tras
  const currentPath = context.url.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => currentPath === route || currentPath.startsWith(route));
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.includes(currentPath);
  const isAuthenticated = !!session;

  // 5a. Zalogowany użytkownik próbuje wejść na /login lub /register
  if (isAuthenticated && isGuestOnlyRoute) {
    return Response.redirect(new URL('/ski-specs', context.url));
  }

  // 5b. Niezalogowany użytkownik próbuje wejść na chronioną trasę
  if (!isAuthenticated && !isPublicRoute) {
    const redirectTo = encodeURIComponent(currentPath + context.url.search);
    return Response.redirect(new URL(`/auth/login?redirectTo=${redirectTo}`, context.url));
  }

  // 6. Kontynuacja requestu
  return next();
});
```

#### 2.1.2 Aktualizacja typów globals (env.d.ts)

**Plik:** `src/env.d.ts`

```typescript
/// <reference types="astro/client" />

import type { SkiSpecService } from '@/lib/services/SkiSpecService';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      userId: string | null;
      skiSpecService: SkiSpecService | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string; // publiczne dla klienta
  readonly PUBLIC_SUPABASE_KEY: string; // publiczne dla klienta
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 2.2 Zarządzanie sesją

#### 2.2.1 Strategia cookies i tokenów

**A. Cookies zarządzane przez Supabase SSR**

- **Nazwa cookies:**
  - `sb-access-token` - JWT access token
  - `sb-refresh-token` - Refresh token
- **Opcje:**
  - `httpOnly: true` - zapobiega dostępowi JavaScript
  - `secure: true` - tylko HTTPS (produkcja)
  - `sameSite: 'lax'` - ochrona CSRF
  - `path: '/'` - dostępne dla całej aplikacji
- **Czas życia:**
  - Access token: 1 godzina (domyślnie w Supabase)
  - Refresh token: 30 dni (domyślnie w Supabase)
- **Automatyczne odświeżanie:**
  - Supabase automatycznie odświeża tokeny przy wykorzystaniu refresh token
  - Middleware przy każdym żądaniu sprawdza i odświeża sesję jeśli potrzeba

**B. Flow autentykacji token-based**

1. Użytkownik loguje się → Supabase zwraca access + refresh token
2. Tokeny zapisywane jako httpOnly cookies
3. Przy każdym żądaniu (middleware):
   - Odczyt tokenów z cookies
   - Weryfikacja access token
   - Jeśli wygasł → użycie refresh token do uzyskania nowego
   - Aktualizacja cookies
4. Przy wylogowaniu → usunięcie cookies

#### 2.2.2 Server-Side vs Client-Side Supabase Client

**A. Server-Side Client (w middleware i API routes)**

```typescript
import { createServerClient } from '@supabase/ssr';

const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
  cookies: {
    get: (key) => context.cookies.get(key)?.value,
    set: (key, value, options) => context.cookies.set(key, value, options),
    remove: (key, options) => context.cookies.delete(key, options),
  },
});
```

**Użycie:**

- W middleware Astro
- W API routes (server endpoints)
- Dostęp do sesji użytkownika po stronie serwera
- Zarządzanie cookies

**B. Client-Side Client (w komponentach React)**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_KEY);
```

**Użycie:**

- W komponentach React (formularze logowania, rejestracji, itp.)
- Do wywołań auth (signIn, signUp, signOut, resetPassword)
- Do subskrypcji zmian stanu autentykacji (onAuthStateChange)

### 2.3 API Endpoints (jeśli potrzebne)

Większość operacji uwierzytelniania jest obsługiwana bezpośrednio przez Supabase Auth. Jednak możemy utworzyć pomocnicze endpointy dla specyficznych przypadków:

#### 2.3.1 GET /api/auth/session

- **Cel:** Sprawdzenie bieżącej sesji użytkownika po stronie klienta
- **Plik:** `src/pages/api/auth/session.ts`
- **Metoda:** GET
- **Odpowiedź:**

```typescript
{
  user: {
    id: string;
    email: string;
    // ...inne pola
  } | null;
  isAuthenticated: boolean;
}
```

- **Implementacja:**

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { session } = locals;

  if (!session?.user) {
    return new Response(JSON.stringify({ user: null, isAuthenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      isAuthenticated: true,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

#### 2.3.2 POST /api/auth/logout

- **Cel:** Wylogowanie użytkownika i czyszczenie sesji
- **Plik:** `src/pages/api/auth/logout.ts`
- **Metoda:** POST
- **Implementacja:**

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const { supabase } = locals;

  // Wylogowanie przez Supabase
  await supabase.auth.signOut();

  // Supabase SSR automatycznie czyści cookies przez funkcje set/remove

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Uwaga:** Ten endpoint jest opcjonalny, bo wylogowanie może być wykonane bezpośrednio z komponentu React przez client-side Supabase client.

### 2.4 Obsługa błędów na poziomie API

#### 2.4.1 Mapowanie błędów Supabase Auth

Utworzenie helpera do mapowania błędów:

**Plik:** `src/lib/helpers/auth-errors.ts`

```typescript
export interface AuthError {
  message: string;
  code?: string;
}

export const mapSupabaseAuthError = (error: any): AuthError => {
  const code = error?.code || error?.error_code || 'unknown_error';

  const errorMessages: Record<string, string> = {
    invalid_credentials: 'Nieprawidłowy email lub hasło',
    email_not_confirmed: 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.',
    user_already_exists: 'Ten adres email jest już zarejestrowany',
    weak_password: 'Hasło jest zbyt słabe. Użyj silniejszego hasła.',
    over_email_send_rate_limit: 'Zbyt wiele prób wysłania emaila. Spróbuj ponownie później.',
    invalid_grant: 'Link resetujący hasło wygasł lub jest nieprawidłowy',
    refresh_token_not_found: 'Sesja wygasła. Zaloguj się ponownie.',
    email_provider_disabled: 'Logowanie przez email jest obecnie niedostępne',
    validation_failed: 'Dane formularza są nieprawidłowe',
  };

  return {
    message: errorMessages[code] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    code,
  };
};
```

#### 2.4.2 Rate limiting i security

**Zabezpieczenia na poziomie Supabase:**

- Rate limiting dla wywołań auth (domyślnie w Supabase)
- Email verification (opcjonalnie włączone w ustawieniach projektu Supabase)
- Captcha dla rejestracji (opcjonalnie przez Supabase turnstile/recaptcha integration)

**Dodatkowe zabezpieczenia aplikacji:**

- Middleware sprawdza sesję przy każdym żądaniu
- Ochrona CSRF przez SameSite cookies
- HttpOnly cookies zapobiegają kradzieży tokenów przez XSS

### 2.5 Aktualizacja Server-Side Rendering (SSR)

#### 2.5.1 Zmiana trybu renderowania dla stron auth

Wszystkie strony uwierzytelniania muszą być renderowane po stronie serwera (SSR), ponieważ:

- Sprawdzają sesję w middleware
- Wykonują przekierowania po stronie serwera
- Muszą obsługiwać cookies

**Konfiguracja w astro.config.mjs:**

```javascript
export default defineConfig({
  output: 'server', // już ustawione - OK
  // ...
});
```

Wszystkie nowe strony automatycznie korzystają z SSR.

#### 2.5.2 Renderowanie warunkowe w Astro pages

Przykład warunkowego renderowania w zależności od stanu autentykacji:

**Plik:** `src/pages/index.astro` (landing page)

```astro
---
const session = Astro.locals.session;
const isAuthenticated = !!session;
---

<Layout title="Ski Surface Spec Extension">
  <!-- Hero Section -->
  <section>
    <h1>Ski Surface Spec Extension</h1>
    <p>...</p>
    <div class="cta-buttons">
      {
        isAuthenticated ? (
          <Button asChild>
            <a href="/ski-specs">Przejdź do specyfikacji</a>
          </Button>
        ) : (
          <>
            <Button asChild>
              <a href="/auth/register">Zarejestruj się</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/auth/login">Zaloguj się</a>
            </Button>
          </>
        )
      }
    </div>
  </section>
</Layout>
```

---

## 3. SYSTEM UWIERZYTELNIANIA - INTEGRACJA Z SUPABASE

### 3.1 Konfiguracja Supabase Auth

#### 3.1.1 Ustawienia projektu Supabase

**A. Email Authentication**

W panelu Supabase → Authentication → Providers → Email:

- **Enable Email provider:** Włączone
- **Confirm email:** Opcjonalnie (zalecane dla produkcji, wyłączone dla dev)
- **Secure email change:** Włączone
- **Secure password change:** Włączone

**B. Email Templates**

Dostosowanie szablonów emaili w Supabase → Authentication → Email Templates:

- **Confirm signup:** Email potwierdzający rejestrację
- **Invite user:** Email z zaproszeniem
- **Magic Link:** Email z linkiem do logowania (jeśli używane)
- **Change Email Address:** Email potwierdzający zmianę adresu
- **Reset Password:** Email z linkiem do resetu hasła
  - Redirect URL: `https://yourdomain.com/auth/update-password`

**C. Password Requirements**

W Supabase → Authentication → Policies:

- **Minimum password length:** 8 znaków (zalecane)

**D. Rate Limiting**

Domyślnie Supabase ma wbudowane rate limiting:

- Maksymalna liczba requestów auth na IP
- Ochrona przed brute-force

**E. Redirect URLs (Allowed)**

W Supabase → Authentication → URL Configuration → Redirect URLs:

```
http://localhost:3000/auth/update-password (dev)
https://yourdomain.com/auth/update-password (prod)
http://localhost:3000/* (dev - opcjonalnie wildcard)
https://yourdomain.com/* (prod - opcjonalnie wildcard)
```

#### 3.1.2 Zmienne środowiskowe

**Plik:** `.env` (dla dev) i zmienne środowiskowe w produkcji

```bash
# Server-side (prywatne - nie ekspozowane do przeglądarki)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Client-side (publiczne - dostępne w przeglądarce jako import.meta.env.PUBLIC_*)
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_KEY=your-supabase-anon-key

# Pozostałe
OPENROUTER_API_KEY=your-openrouter-key
```

**Uwaga:** `SUPABASE_KEY` to **anon key**, nie service_role key (service_role ma pełne uprawnienia i nie powinien być używany po stronie klienta).

#### 3.1.3 Row Level Security (RLS) w PostgreSQL

Po włączeniu autentykacji, należy zaktualizować polityki RLS dla tabel:

**Tabela: `ski_specs`**

```sql
-- Włączenie RLS
ALTER TABLE ski_specs ENABLE ROW LEVEL SECURITY;

-- Polityka: Użytkownik może widzieć tylko swoje specyfikacje
CREATE POLICY "Users can view own ski specs"
ON ski_specs FOR SELECT
USING (auth.uid() = user_id);

-- Polityka: Użytkownik może dodawać specyfikacje
CREATE POLICY "Users can insert own ski specs"
ON ski_specs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Polityka: Użytkownik może aktualizować swoje specyfikacje
CREATE POLICY "Users can update own ski specs"
ON ski_specs FOR UPDATE
USING (auth.uid() = user_id);

-- Polityka: Użytkownik może usuwać swoje specyfikacje
CREATE POLICY "Users can delete own ski specs"
ON ski_specs FOR DELETE
USING (auth.uid() = user_id);
```

**Tabela: `notes`**

```sql
-- Włączenie RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Polityka: Użytkownik może widzieć notatki swoich specyfikacji
CREATE POLICY "Users can view notes of own ski specs"
ON notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ski_specs
    WHERE ski_specs.id = notes.ski_spec_id
    AND ski_specs.user_id = auth.uid()
  )
);

-- Polityka: Użytkownik może dodawać notatki do swoich specyfikacji
CREATE POLICY "Users can insert notes to own ski specs"
ON notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ski_specs
    WHERE ski_specs.id = notes.ski_spec_id
    AND ski_specs.user_id = auth.uid()
  )
);

-- Polityka: Użytkownik może aktualizować notatki swoich specyfikacji
CREATE POLICY "Users can update notes of own ski specs"
ON notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM ski_specs
    WHERE ski_specs.id = notes.ski_spec_id
    AND ski_specs.user_id = auth.uid()
  )
);

-- Polityka: Użytkownik może usuwać notatki swoich specyfikacji
CREATE POLICY "Users can delete notes of own ski specs"
ON notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ski_specs
    WHERE ski_specs.id = notes.ski_spec_id
    AND ski_specs.user_id = auth.uid()
  )
);
```

### 3.2 Obsługa sesji w Astro

#### 3.2.1 Cykl życia sesji

**1. Utworzenie sesji (Login/Register)**

- Użytkownik wypełnia formularz logowania/rejestracji w komponencie React
- Wywołanie client-side Supabase: `supabase.auth.signInWithPassword()` lub `supabase.auth.signUp()`
- Supabase zwraca access token i refresh token
- React zapisuje tokeny jako httpOnly cookies (automatycznie przez Supabase JS)
- Przeładowanie strony lub redirect (`window.location.href = '/ski-specs'`)

**2. Weryfikacja sesji (Middleware)**

- Przy każdym żądaniu middleware odczytuje cookies
- Utworzenie server-side Supabase client z cookies
- Wywołanie `supabase.auth.getSession()` → weryfikacja i odświeżenie tokenów
- Sesja zapisywana w `context.locals.session`
- Jeśli sesja nieważna → przekierowanie do `/login`

**3. Odświeżanie sesji (Automatic)**

- Supabase automatycznie odświeża access token przed wygaśnięciem używając refresh token
- Middleware przy każdym żądaniu odświeża tokeny jeśli to konieczne
- Nowe tokeny zapisywane w cookies

**4. Zakończenie sesji (Logout)**

- Użytkownik klika "Wyloguj" w `UserMenu`
- Wywołanie client-side: `supabase.auth.signOut()`
- Supabase usuwa cookies
- Redirect do landing page

#### 3.2.2 Persistent sessions vs Session-only

**Domyślna konfiguracja (Persistent):**

- Refresh token ma długi czas życia (30 dni)
- Użytkownik pozostaje zalogowany nawet po zamknięciu przeglądarki
- Access token odświeżany automatycznie

**Opcjonalnie - Session-only (checkbox "Zapamiętaj mnie"):**

Jeśli użytkownik NIE zaznaczy "Zapamiętaj mnie":

```typescript
// W LoginForm.tsx po successful login:
if (!rememberMe) {
  // Zmiana persistence storage na 'session' (tylko dla bieżącej sesji przeglądarki)
  await supabase.auth.updateUser(
    {},
    {
      data: { session_persistence: 'session' },
    }
  );
}
```

**Implementacja opcjonalna** - można pominąć w MVP i domyślnie zawsze używać persistent sessions.

### 3.3 Token Management

#### 3.3.1 Access Token i Refresh Token

**Access Token (JWT):**

- Krótki czas życia: 1 godzina (domyślnie w Supabase)
- Zawiera claims: `user_id`, `email`, `role`, `exp` (expiration)
- Używany do autoryzacji requestów API
- Przekazywany w header: `Authorization: Bearer <access_token>`

**Refresh Token:**

- Długi czas życia: 30 dni (domyślnie w Supabase)
- Używany tylko do uzyskania nowego access token
- Przechowywany jako httpOnly cookie (bezpieczny)
- Nie jest wysyłany w headerach requestów

#### 3.3.2 Automatyczne odświeżanie tokenów

Supabase SDK automatycznie zarządza odświeżaniem tokenów:

**Po stronie klienta (React):**

```typescript
// W useAuth hook lub na poziomie app
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token odświeżony automatycznie');
    }
    if (event === 'SIGNED_OUT') {
      // Przekierowanie do login
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

**Po stronie serwera (Middleware):**

- `createServerClient` z cookies adapter automatycznie odświeża tokeny
- Przy każdym żądaniu sprawdza czy access token nie wygasł
- Jeśli wygasł, używa refresh token do uzyskania nowego
- Aktualizuje cookies z nowymi tokenami

#### 3.3.3 Bezpieczeństwo tokenów

**HttpOnly Cookies:**

- Tokeny przechowywane jako httpOnly cookies
- JavaScript nie ma dostępu (ochrona przed XSS)
- Cookies wysyłane automatycznie z każdym żądaniem

**Secure Cookies (HTTPS):**

- W produkcji: `secure: true` (tylko HTTPS)
- W dev (localhost): `secure: false`

**SameSite:**

- `sameSite: 'lax'` - ochrona przed CSRF
- Cookies wysyłane tylko dla tego samego origin

### 3.4 Integracja z istniejącą warstwą serwisową

#### 3.4.1 Aktualizacja SkiSpecService

**Obecna implementacja:**

```typescript
// src/lib/services/SkiSpecService.ts
export class SkiSpecService {
  constructor(private supabase: SupabaseClient) {}

  async createSkiSpec(userId: string, command: CreateSkiSpecCommand) {
    // ...
  }
}
```

**Brak zmian potrzebnych** - serwis już przyjmuje `userId` jako parametr. Po aktualizacji middleware, będzie to rzeczywisty userId z sesji zamiast mocka.

#### 3.4.2 Weryfikacja autoryzacji w serwisach

Serwisy już weryfikują `user_id` przy operacjach:

```typescript
async getSkiSpec(userId: string, specId: string): Promise<SkiSpecDTO | null> {
  const { data, error } = await this.supabase
    .from('ski_specs')
    .select('*')
    .eq('id', specId)
    .eq('user_id', userId) // ✓ Weryfikacja właściciela
    .single();

  // ...
}
```

**Po włączeniu RLS:**

- RLS na poziomie bazy danych dodatkowo weryfikuje dostęp
- Podwójna warstwa bezpieczeństwa: application-level (serwis) + database-level (RLS)

#### 3.4.3 Obsługa braku userId (dla tras publicznych)

Dla tras gdzie `userId` może być null (np. health check):

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Kontynuacja jeśli zalogowany
};
```

Jednak w większości przypadków middleware już przekieruje niezalogowanych użytkowników, więc nie dojdzie do wywołania endpoint.

### 3.5 Error Handling i Edge Cases

#### 3.5.1 Wygaśnięcie refresh token

**Scenariusz:** Użytkownik nie logował się przez 30 dni, refresh token wygasł.

**Obsługa:**

1. Middleware próbuje odświeżyć sesję → błąd
2. `session` w locals = null
3. Middleware przekierowuje do `/login?redirectTo=...&error=session_expired`
4. Strona logowania wyświetla komunikat: "Twoja sesja wygasła. Zaloguj się ponownie."

#### 3.5.2 Jednoczesne sesje (multiple devices)

Supabase pozwala na wiele jednoczesnych sesji:

- Użytkownik może być zalogowany na wielu urządzeniach
- Każde urządzenie ma własną parę tokenów
- Wylogowanie na jednym urządzeniu nie wylogowuje z innych (chyba że używamy `signOut({ scope: 'global' })`)

**Domyślne zachowanie:** Local scope (tylko bieżące urządzenie).

#### 3.5.3 Email verification (opcjonalnie)

Jeśli włączona weryfikacja emaila w Supabase:

**Flow:**

1. Rejestracja → `supabase.auth.signUp()`
2. Supabase wysyła email z linkiem weryfikacyjnym
3. Użytkownik NIE jest automatycznie zalogowany
4. Wyświetlenie komunikatu: "Sprawdź swoją skrzynkę pocztową i kliknij link weryfikacyjny"
5. Po kliknięciu linku → przekierowanie do `/auth/login?verified=true`
6. Komunikat: "Email zweryfikowany! Możesz się teraz zalogować"
7. Logowanie działa normalnie

**W komponencie RegisterForm:**

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/login?verified=true`,
  },
});

if (data?.user && !data.session) {
  // Email verification włączona
  toast.success('Sprawdź swoją skrzynkę pocztową i kliknij link weryfikacyjny');
  // NIE przekierowujemy do /ski-specs
} else if (data?.session) {
  // Email verification wyłączona - automatyczne logowanie
  window.location.href = '/ski-specs';
}
```

---

## 4. PLAN IMPLEMENTACJI

### 4.1 Etapy wdrożenia

#### Etap 1: Konfiguracja Supabase i środowiska (1-2h)

- [ ] Konfiguracja Email Authentication w Supabase
- [ ] Dostosowanie email templates
- [ ] Ustawienie redirect URLs
- [ ] Dodanie zmiennych środowiskowych (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY)
- [ ] Instalacja `@supabase/ssr`: `pnpm add @supabase/ssr`

#### Etap 2: Aktualizacja middleware i typów (2-3h)

- [ ] Aktualizacja `src/middleware/index.ts` - zastąpienie mocka prawdziwą autentykacją
- [ ] Aktualizacja `src/env.d.ts` - dodanie `supabase` i `session` do `App.Locals`
- [ ] Utworzenie helpera `src/lib/helpers/auth-errors.ts`
- [ ] Testowanie middleware: weryfikacja przekierowań dla zalogowanych/niezalogowanych

#### Etap 3: Komponenty formularzy uwierzytelniania (6-8h)

- [ ] Utworzenie `src/components/auth/LoginForm.tsx` + schema Zod
- [ ] Utworzenie `src/components/auth/RegisterForm.tsx` + schema Zod
- [ ] Utworzenie `src/components/auth/ResetPasswordForm.tsx` + schema Zod
- [ ] Utworzenie `src/components/auth/UpdatePasswordForm.tsx` + schema Zod
- [ ] Utworzenie `src/components/auth/PasswordStrengthIndicator.tsx`
- [ ] Utworzenie `src/components/hooks/useAuth.ts`
- [ ] Utworzenie `src/components/hooks/useSupabaseClient.ts`
- [ ] Testowanie walidacji formularzy
- [ ] Testowanie integracji z Supabase Auth (sign up, sign in, reset password)

#### Etap 4: Strony uwierzytelniania (4-5h)

- [ ] Utworzenie `src/pages/auth/login.astro`
- [ ] Utworzenie `src/pages/auth/register.astro`
- [ ] Utworzenie `src/pages/auth/reset-password.astro`
- [ ] Utworzenie `src/pages/auth/update-password.astro`
- [ ] Testowanie przekierowań i flow użytkownika

#### Etap 5: Aktualizacja nawigacji i layoutu (3-4h)

- [ ] Utworzenie `src/components/auth/UserMenu.tsx`
- [ ] Modyfikacja `src/components/Navigation.tsx` - dynamiczne menu
- [ ] Modyfikacja `src/components/Header.astro` - warunkowe renderowanie
- [ ] Modyfikacja `src/pages/index.astro` - nowe CTA dla auth
- [ ] Testowanie zmiany UI w zależności od stanu autentykacji

#### Etap 6: Row Level Security (RLS) w bazie danych (2-3h)

- [ ] Utworzenie migracji dla polityk RLS na tabeli `ski_specs`
- [ ] Utworzenie migracji dla polityk RLS na tabeli `notes`
- [ ] Testowanie polityk: użytkownik widzi tylko swoje dane
- [ ] Weryfikacja braku dostępu do danych innych użytkowników

#### Etap 7: Opcjonalne endpointy API (1-2h)

- [ ] Utworzenie `src/pages/api/auth/session.ts` (opcjonalnie)
- [ ] Utworzenie `src/pages/api/auth/logout.ts` (opcjonalnie)
- [ ] Testowanie endpointów

#### Etap 8: Client-side guards i error handling (3-4h)

- [ ] Utworzenie `src/components/auth/AuthGuard.tsx` - przechwytywanie 401
- [ ] Integracja AuthGuard z wywołaniami API
- [ ] Testowanie scenariusza wygasłej sesji
- [ ] Dodanie toastów dla wszystkich akcji auth (sukces/błąd)

#### Etap 9: Testy end-to-end i QA (4-6h)

- [ ] Testowanie pełnego flow rejestracji
- [ ] Testowanie pełnego flow logowania (z redirectTo)
- [ ] Testowanie flow resetowania hasła
- [ ] Testowanie wylogowania
- [ ] Testowanie ochrony tras (próba dostępu bez logowania)
- [ ] Testowanie przekierowań (zalogowany na /auth/login → /ski-specs)
- [ ] Testowanie wielokrotnych prób logowania (rate limiting)
- [ ] Testowanie na różnych przeglądarkach
- [ ] Testowanie responsywności formularzy

#### Etap 10: Dokumentacja i cleanup (2-3h)

- [ ] Aktualizacja README z instrukcjami konfiguracji auth
- [ ] Aktualizacja CLAUDE.md z informacją o autentykacji
- [ ] Usunięcie komentarzy TODO z kodu
- [ ] Code review i refactoring

**Łączny szacowany czas:** 28-40 godzin (około 1-1.5 tygodnia dla jednego developera)

### 4.2 Zależności między etapami

```
Etap 1 (Konfiguracja)
   ↓
Etap 2 (Middleware) ← musi być przed wszystkim
   ↓
   ├→ Etap 3 (Formularze)
   │     ↓
   │  Etap 4 (Strony auth)
   │
   └→ Etap 5 (Nawigacja)

Etap 6 (RLS) - może być równolegle z 3-5

Etap 7 (API endpoints) - opcjonalny, po Etapie 2

Etap 8 (Guards) - po Etapach 3-4

Etap 9 (Testy) - po wszystkich poprzednich

Etap 10 (Dokumentacja) - na końcu
```

### 4.3 Priorytety i MVP Auth

**Must-have dla MVP:**

- Etapy 1-6 (bez 7)
- Etap 8 (basic error handling)
- Podstawowe testy z Etapu 9

**Nice-to-have (można odłożyć):**

- Etap 7 (API endpoints) - niepotrzebne jeśli wszystko działa przez client-side Supabase
- Email verification - można włączyć później
- "Zapamiętaj mnie" checkbox - można pominąć (domyślnie persistent sessions)
- Password strength indicator - można uprościć do samej walidacji

---

## 5. CHECKLIST ZGODNOŚCI Z PRD I UI-PLAN

### 5.1 Zgodność z wymaganiami PRD

- [x] **US-000:** Landing page dostępna publicznie bez logowania ✓
- [x] **US-001:** Rejestracja z email/hasło, walidacja, automatyczne logowanie, redirect do `/ski-specs` ✓
- [x] **US-002:** Logowanie z email/hasło, walidacja, redirect do `redirectTo` lub `/ski-specs`, blokada po przekroczeniu limitu prób ✓
- [x] **US-003:** Wylogowanie z przyciskiem w UserMenu, przekierowanie do `/` ✓
- [x] **US-004:** Resetowanie hasła z emailem, wygasającym linkiem, walidacją nowego hasła ✓ (tylko przez proces "Zapomniałem hasła")
- [x] Zalogowany użytkownik na `/auth/login` lub `/auth/register` → redirect do `/ski-specs` ✓
- [x] Niezalogowany na chronioną trasę → redirect do `/auth/login?redirectTo=...` ✓
- [x] Walidacja email, hasła, wymogi bezpieczeństwa ✓

### 5.2 Zgodność z UI Plan

- [x] Middleware w `src/middleware/index.ts` z whitelist `/auth/login`, `/auth/register`, `/api/health` ✓
  - Dodane również: `/`, `/auth/reset-password`, `/auth/update-password`, `/404`
- [x] Client-side guard przechwytuje 401 i przekierowuje do `/auth/login?redirectTo=...` ✓
- [x] Publiczne trasy: `/`, `/auth/login`, `/auth/register`, `/404`, `/auth/reset-password`, `/auth/update-password` ✓
- [x] Chronione trasy: `/ski-specs`, `/ski-specs/*`, `/compare`, `/api/ski-specs/*` ✓
- [x] Navigation bar dynamiczny w zależności od stanu autentykacji ✓
- [x] User dropdown menu z emailem w trigger i tylko akcją wylogowania w dropdown ✓
- [x] Zalogowany na `/` może pozostać (nie ma auto-redirect) ✓
- [x] Zalogowany na `/auth/login` lub `/auth/register` → redirect do `/ski-specs` ✓

### 5.3 Zgodność z Tech Stack

- [x] Supabase Auth dla uwierzytelniania ✓
- [x] Astro 5 (SSR mode) ✓
- [x] React 19 dla komponentów interaktywnych ✓
- [x] TypeScript 5 ✓
- [x] Tailwind 4 + Shadcn/ui ✓
- [x] Integracja z istniejącym Supabase client i database types ✓

### 5.4 Bezpieczeństwo i best practices

- [x] HttpOnly cookies dla tokenów ✓
- [x] SameSite cookies (CSRF protection) ✓
- [x] Row Level Security (RLS) w PostgreSQL ✓
- [x] Walidacja po stronie klienta (Zod) i serwera (Supabase) ✓
- [x] Rate limiting (przez Supabase) ✓
- [x] Generyczne komunikaty błędów (security) ✓
- [x] Weryfikacja właściciela zasobów (user_id) ✓
- [x] Automatyczne odświeżanie tokenów ✓

---

## 6. RYZYKA I MITYGACJA

### 6.1 Zidentyfikowane ryzyka

**Ryzyko 1: Problemy z cookies w różnych przeglądarkach**

- **Mitygacja:** Testowanie na Chrome, Firefox, Safari, Edge
- **Fallback:** Dokumentacja known issues, ewentualne dostosowanie strategii cookies

**Ryzyko 2: Rate limiting Supabase Auth w dev (zbyt wiele prób podczas testów)**

- **Mitygacja:** Używanie różnych emailów dla testów, czyszczenie bazy między testami
- **Fallback:** Czekanie lub kontakt z supportem Supabase

**Ryzyko 3: Konflikty między server-side a client-side Supabase clients**

- **Mitygacja:** Jasne rozdzielenie odpowiedzialności (middleware = server, formularze = client)
- **Fallback:** Dokładne czytanie dokumentacji @supabase/ssr

**Ryzyko 4: Problemy z przekierowaniami w SSR (Astro)**

- **Mitygacja:** Testowanie różnych scenariuszy przekierowań
- **Fallback:** Użycie meta refresh lub JavaScript redirect jako backup

**Ryzyko 5: Email delivery issues (spam filters)**

- **Mitygacja:** Konfiguracja SPF/DKIM w Supabase (dla custom domain)
- **Fallback:** Użycie Supabase default sender na początku

### 6.2 Plan testowania

**Unit tests:**

- Zod schemas walidacji
- Helpery (mapowanie błędów)
- Custom hooks (useAuth, useSupabaseClient)

**Integration tests:**

- Flow rejestracji (end-to-end)
- Flow logowania
- Flow resetowania hasła
- Middleware przekierowania

**Manual QA:**

- Wszystkie user flows z sekcji 1.5
- Cross-browser testing
- Responsive design testing
- Error scenarios

---

## 7. PODSUMOWANIE

### 7.1 Kluczowe punkty architektoniczne

1. **Separacja odpowiedzialności:**
   - Middleware (Astro) = weryfikacja sesji, przekierowania, ochrona tras
   - React components = interaktywne formularze, zarządzanie stanem UI
   - Supabase Auth = zarządzanie użytkownikami, tokenami, emailami

2. **Bezpieczeństwo na wielu poziomach:**
   - Application-level (middleware + serwisy)
   - Database-level (Row Level Security)
   - Transport-level (HttpOnly + Secure + SameSite cookies)

3. **Developer Experience:**
   - TypeScript dla type safety
   - Zod dla runtime validation
   - Shadcn/ui dla spójnego UI
   - Custom hooks dla reusable logic

4. **User Experience:**
   - Jasne komunikaty błędów
   - Walidacja real-time
   - Automatyczne przekierowania
   - Persistent sessions (wygodne logowanie)

### 7.2 Następne kroki

Po zatwierdzeniu tej specyfikacji:

1. **Code review specyfikacji** przez team (jeśli dotyczy)
2. **Rozpoczęcie implementacji** według planu z sekcji 4.1
3. **Iteracyjne testowanie** po każdym etapie
4. **Dokumentacja zmian** w CHANGELOG (dla przyszłych developerów)
5. **Deployment** na środowisko testowe przed produkcją

### 7.3 Kontakt i pytania

W razie pytań lub potrzeby wyjaśnienia szczegółów specyfikacji:

- Konsultacja z dokumentacją Supabase Auth: https://supabase.com/docs/guides/auth
- Konsultacja z dokumentacją Astro middleware: https://docs.astro.build/en/guides/middleware/
- Konsultacja z dokumentacją @supabase/ssr: https://supabase.com/docs/guides/auth/server-side-rendering

---

**Koniec specyfikacji technicznej**

Data utworzenia: 2025-10-20
Data aktualizacji: 2025-10-21
Wersja: 1.1
Status: Gotowa do implementacji

## Historia zmian

### Wersja 1.1 (2025-10-21)

- Zmiana routingu: dodanie prefiksu `/auth/` do wszystkich stron uwierzytelniania (`/login` → `/auth/login`, `/register` → `/auth/register`, `/reset-password` → `/auth/reset-password`, `/update-password` → `/auth/update-password`)
- Usunięcie strony `/account` i całej funkcjonalności zarządzania kontem dla zalogowanych użytkowników
- Zmiana hasła dostępna tylko przez proces "Zapomniałem hasła"
- Uproszczenie komponentu UserMenu: tylko akcja "Wyloguj" w dropdown, email wyświetlany w trigger
- Usunięcie linku "Account" z nawigacji dla zalogowanych użytkowników
- Aktualizacja middleware: PUBLIC_ROUTES i GUEST_ONLY_ROUTES z prefiksem `/auth/`
- Usunięcie Etapu 6 (Aktualizacja strony konta) z planu implementacji
- Przesunięcie numeracji etapów: 7→6, 8→7, 9→8, 10→9, 11→10
- Zmniejszenie szacowanego czasu implementacji z 30-43h na 28-40h
- Aktualizacja wszystkich przekierowań i linków w dokumentacji
