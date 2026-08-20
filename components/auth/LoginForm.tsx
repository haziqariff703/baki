'use client';

import { useState, type FormEvent, type JSX } from 'react';
import { useTranslations } from 'next-intl';
import { LogIn, UserPlus, Info, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { loginFormSchema } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type FieldKey = 'email' | 'password';
type FieldErrors = Partial<Record<FieldKey, string>>;

function GoogleGlyph(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3281-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z" />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations('Login');
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const result = loginFormSchema.safeParse({ email, password });
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      const key = issue.message; 
      if (field === 'email' || field === 'password') {
        next[field] ??= key;
      }
    }
    setErrors(next);
    return false;
  }

  async function handleAuthAction(action: 'signin' | 'signup') {
    if (!validate()) return;
    
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const { error, data } = action === 'signin' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setIsLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (action === 'signup' && data?.user?.identities?.length === 0) {
      setAuthError('User already exists');
      return;
    }

    if (action === 'signup' && data?.session === null) {
      setAuthSuccess('Please check your email to confirm your account.');
      return;
    }

    // Success login -> Direct to Dashboard
    router.refresh();
    router.push('/dashboard');
  }

  async function onGoogleClick() {
    setIsLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      }
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
    }
  }

  const inputClass = (invalid: boolean) =>
    cn(
      'w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2.5',
      'border transition-colors placeholder:text-text-faint',
      'focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed',
      invalid
        ? 'border-status-rose-border focus:border-status-rose-border'
        : 'border-border-2 focus:border-accent',
    );

  return (
    <>
      <div className="space-y-5">
        <button
          type="button"
          onClick={onGoogleClick}
          disabled={isLoading}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl',
            'border border-border-2 bg-surface-2 text-text-primary text-sm font-medium',
            'transition-colors hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleGlyph />}
          {t('google')}
        </button>

        {authError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-status-rose-border bg-status-rose-bg px-3.5 py-3 text-xs text-status-rose-text">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}
        
        {authSuccess && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-border-1 bg-surface-2 px-3.5 py-3 text-xs text-text-primary">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-accent" aria-hidden="true" />
            <span>{authSuccess}</span>
          </div>
        )}

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border-1" />
          <span className="text-xs text-text-faint">{t('divider')}</span>
          <span className="h-px flex-1 bg-border-1" />
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleAuthAction('signin'); }} noValidate className="space-y-5 mt-5">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-xs font-medium text-text-muted">
            {t('emailLabel')}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className={inputClass(Boolean(errors.email))}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="flex items-center gap-1.5 text-xs text-status-rose-text">
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {t(`errors.${errors.email}`)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-xs font-medium text-text-muted">
            {t('passwordLabel')}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            className={inputClass(Boolean(errors.password))}
          />
          {errors.password && (
            <p id="login-password-error" role="alert" className="flex items-center gap-1.5 text-xs text-status-rose-text">
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {t(`errors.${errors.password}`)}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAuthAction('signup')}
            disabled={isLoading}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl',
              'border border-border-2 bg-transparent text-text-primary text-sm font-medium',
              'transition-colors hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Sign Up
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl',
              'border border-border-3 bg-surface-3 text-text-primary text-sm font-medium',
              'transition-colors hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            {t('submit')}
          </button>
        </div>

        <p className="text-center text-xs text-text-muted">
          <Link
            href="/"
            className="underline underline-offset-4 decoration-border-3 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            {t('backToHome')}
          </Link>
        </p>
      </form>
    </>
  );
}
