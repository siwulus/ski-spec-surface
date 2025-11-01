# Supabase Redirect URLs Configuration

## Overview

This document describes how to configure Redirect URLs in Supabase for the password reset flow with PKCE (Proof Key for Code Exchange).

## Why This Is Needed

When a user requests a password reset, Supabase sends an email with a link containing an authorization code. This link must redirect to our application's callback endpoint (`/api/auth/callback`) to complete the PKCE flow by exchanging the code for a session.

For security reasons, Supabase only allows redirects to pre-configured URLs. Any redirect URL not on the allowlist will be rejected.

## Configuration Steps

### 1. Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

### 2. Add Redirect URLs

In the **Redirect URLs** section, add the following URLs:

#### For Development (Local):

```
http://localhost:3000/api/auth/callback
```

#### For Production:

```
https://yourdomain.com/api/auth/callback
```

Replace `yourdomain.com` with your actual production domain.

### 3. Save Changes

Click **Save** to apply the configuration.

## Password Reset Flow

After configuration, the password reset flow works as follows:

1. User clicks "Forgot password" → enters email
2. Supabase sends email with reset link:
   ```
   http://localhost:3000/api/auth/callback?code=xxxxxxxxx
   ```
3. User clicks link → redirected to callback endpoint
4. Callback endpoint exchanges code for session (PKCE flow)
5. User is redirected to `/auth/update-password` with active session
6. User changes password → automatically logged out
7. User is redirected to `/auth/login` with success message

## Security Notes

- The authorization code (`code` parameter) is:
  - **Single-use**: Can only be exchanged once
  - **Time-limited**: Expires after 5 minutes
  - **Secure**: Cannot be guessed or brute-forced

- Never add wildcard URLs to the allowlist in production
- Only add URLs you control and trust
- Use HTTPS in production for secure token transmission

## Troubleshooting

### "Invalid redirect URL" error

**Cause**: The redirect URL is not in the Supabase allowlist.

**Solution**:

1. Verify the URL is added exactly as shown above
2. Check for typos (e.g., extra spaces, incorrect port)
3. Ensure you saved the configuration in Supabase dashboard

### "Code has expired or already been used" error

**Cause**: The authorization code is no longer valid.

**Solution**:

- Request a new password reset email
- Code expires after 5 minutes
- Code can only be used once

### User sees "invalid_code" error on reset password page

**Cause**: The PKCE code exchange failed in the callback endpoint.

**Solution**:

- Check server logs for detailed error messages
- Verify Supabase environment variables are configured correctly
- Ensure the code parameter is present in the URL

## Testing

To test the password reset flow:

1. Navigate to `/auth/reset-password`
2. Enter a valid email address
3. Check your email for the reset link
4. Click the link (should go to `/api/auth/callback?code=...`)
5. You should be redirected to `/auth/update-password`
6. Change your password
7. You should be logged out and redirected to `/auth/login?passwordChanged=true`
8. Log in with your new password

## Related Files

- `/src/pages/api/auth/callback.ts` - PKCE callback endpoint
- `/src/components/hooks/useAuth.ts` - Contains `resetPassword()` function
- `/src/components/auth/UpdatePasswordForm.tsx` - Password update form
- `/src/components/auth/LoginForm.tsx` - Login form (shows success message)
- `/src/middleware/index.ts` - Middleware configuration (PUBLIC_PATHS)

## References

- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Password Reset Documentation](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Server-Side Auth Documentation](https://supabase.com/docs/guides/auth/server-side)
