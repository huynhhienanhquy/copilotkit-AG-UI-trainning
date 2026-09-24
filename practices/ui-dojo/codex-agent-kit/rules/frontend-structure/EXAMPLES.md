# Frontend Structure Examples

Examples demonstrating standard `src/` directory layout and folder responsibility mappings.

---

## 1. Standard `src/` Directory Layout

### Preferred Layout:
```text
src/
├── App.tsx
├── main.tsx
├── assets/
│   ├── fonts/
│   │   └── Inter.woff2
│   └── images/
│       ├── avatars/
│       │   └── default-avatar.png
│       ├── icons/
│       │   └── search.svg
│       └── logos/
│           └── logo.svg
├── components/
│   ├── common/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.stories.tsx
│   │   ├── ErrorBoundary/
│   │   ├── LoadingSpinner/
│   │   └── TextField/
│   └── UserCard/
│       ├── UserCard.tsx
│       └── UserCard.test.tsx
├── config/
│   ├── forms/
│   ├── route/
│   └── validation/
├── constants/
│   ├── routes.ts
│   └── limits.ts
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── data/
│   ├── mockUsers.ts
│   └── countries.ts
├── helpers/
│   ├── formatCurrency.ts
│   └── formatOrderStatus.ts
├── hooks/
│   ├── __tests__/
│   │   ├── useAuth.test.ts
│   │   └── useDebounce.test.ts
│   ├── useAuth.ts
│   └── useDebounce.ts
├── layouts/
│   └── MainLayout/
│       ├── MainLayout.tsx
│       └── MainLayout.test.tsx
├── pages/
│   ├── CheckoutPage/
│   │   ├── actions/
│   │   │   └── handlePayment.ts
│   │   ├── sections/
│   │   │   ├── OrderSummary.tsx
│   │   │   └── PaymentForm.tsx
│   │   └── CheckoutPage.tsx
│   └── OrdersPage/
│       └── OrdersPage.tsx
├── services/
│   ├── api.ts
│   └── userApi.ts
├── stores/
│   ├── authStore.ts
│   └── cartStore.ts
├── styles/
│   ├── globals.css
│   ├── tokens.css
│   └── reset.css
├── types/
│   ├── order.ts
│   └── user.ts
├── utils/
    ├── __tests__/
    │   └── math.test.ts
    └── math.ts
```

---

## 2. File Responsibility Mapping Table

| File Purpose | Correct Folder | Example Path |
|---|---|---|
| Static vector logo | `assets/` | `src/assets/images/logos/brand-logo.svg` |
| Reusable primary button | `components/common/` | `src/components/common/Button/Button.tsx` |
| Environment and route configs | `config/` | `src/config/environment.ts` |
| Immutable API route strings | `constants/` | `src/constants/routes.ts` |
| Global React Auth Provider | `contexts/` | `src/contexts/AuthContext.tsx` |
| Static list of country codes | `data/` | `src/data/countries.ts` |
| Order status badge text formatter | `helpers/` | `src/helpers/formatOrderStatus.ts` |
| Window resize hook | `hooks/` | `src/hooks/useWindowSize.ts` |
| Dashboard sidebar + navbar shell | `layouts/` | `src/layouts/DashboardLayout/DashboardLayout.tsx` |
| Route screen for User Settings | `pages/` | `src/pages/SettingsPage/SettingsPage.tsx` |
| Axios HTTP user service | `services/` | `src/services/userService.ts` |
| Zustand shopping cart store | `stores/` | `src/stores/cartStore.ts` |
| CSS custom property color tokens | `styles/` | `src/styles/tokens.css` |
| Shared User and Order TypeScript types | `types/` | `src/types/user.ts` |
| Generic pure clamping math helper | `utils/` | `src/utils/clamp.ts` |
