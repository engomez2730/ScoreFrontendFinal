# Authentication System Documentation

## Overview

This authentication system provides secure user login/registration functionality with JWT token management and automatic API authentication.

## Components Created

### 1. **Authentication Service** (`src/api/authService.ts`)

- Handles all authentication API calls
- Manages token storage in cookies
- Provides utility functions for token management

**Key Functions:**

- `login(credentials)` - Login user and store token
- `register(userData)` - Register new user and store token
- `logout()` - Clear token and user data
- `verifyToken()` - Verify if current token is valid
- `isAuthenticated()` - Check if user is logged in
- `getCurrentUser()` - Get current user from storage

### 2. **Auth Context** (`src/contexts/AuthContext.tsx`)

- React context for managing authentication state globally
- Provides authentication methods to all components
- Handles automatic token verification on app load

**Available via `useAuth()` hook:**

- `user` - Current user object
- `isAuthenticated` - Boolean authentication status
- `isLoading` - Loading state during auth verification
- `login()`, `register()`, `logout()` - Authentication methods

### 3. **Login Component** (`src/views/LoginView.tsx`)

- Beautiful login form with email/password fields
- Form validation and error handling
- Redirects to home page after successful login
- Link to registration page

### 4. **Register Component** (`src/views/RegisterView.tsx`)

- Registration form with name, email, password fields
- Password confirmation validation
- Automatic login after successful registration
- Link to login page

### 5. **Protected Route Component** (`src/components/ProtectedRoute.tsx`)

- Wrapper component that protects routes requiring authentication
- Shows loading spinner during auth verification
- Redirects to login if user is not authenticated
- Preserves intended destination for post-login redirect

### 6. **Updated API Configuration** (`src/api/axios.ts`)

- Automatic token injection in request headers
- Token format: `Authorization: Bearer <token>`
- Automatic logout on 401 (unauthorized) responses
- Redirect to login page when token expires

## API Endpoints Used

```typescript
POST / api / auth / login; // Login with email/password
POST / api / auth / register; // Register new user
GET / api / auth / profile; // Get user profile (requires token)
POST / api / auth / verify - token; // Verify if token is valid
POST / api / auth / logout; // Logout (optional cleanup)
```

## Token Management

### Storage Strategy

- **Token**: Stored in HTTP-only-style cookies (7-day expiration)
- **User Data**: Stored in localStorage for quick access
- **Automatic Cleanup**: Both cleared on logout or token expiration

### Security Features

- Tokens automatically included in all API requests
- Automatic redirect to login on token expiration
- Secure cookie settings (`SameSite=Strict`)
- Clean logout with token cleanup

## Usage Examples

### Protecting a Route

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Using Auth Context in Components

```tsx
const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      Welcome {user.nombre}!<button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Manual API Calls with Auth

```tsx
// Token is automatically included via axios interceptor
const response = await api.get("/protected-endpoint");
```

## App Structure Updates

### Main App (`src/App.tsx`)

- Wrapped with `AuthProvider` for global auth state
- Split routes into public (login/register) and protected routes
- Updated header with user menu and logout functionality
- Conditional navigation menu (only shown when authenticated)

### Navigation Features

- **When Authenticated**: Shows user avatar, name, and logout dropdown
- **When Not Authenticated**: Shows login button
- **Menu Items**: Only displayed for authenticated users

## Getting Started

1. **User Registration Flow**:

   - Visit `/register`
   - Fill out registration form
   - Automatically logged in and redirected to home

2. **User Login Flow**:

   - Visit `/login`
   - Enter email/password
   - Redirected to intended page or home

3. **Accessing Protected Routes**:
   - All main app routes require authentication
   - Automatic redirect to login if not authenticated
   - Seamless experience once logged in

## Error Handling

- **Network Errors**: Displayed via Ant Design message notifications
- **Validation Errors**: Form-level validation with helpful messages
- **Token Expiration**: Automatic logout and redirect to login
- **Server Errors**: User-friendly error messages

## Security Considerations

- Tokens stored securely with appropriate expiration
- Automatic cleanup on logout
- Protection against XSS with proper token handling
- Unauthorized access prevention with route protection
