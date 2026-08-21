import { useTranslations } from 'next-intl';
import Navbar from '@/components/shared/Navbar';
import { LoginForm } from '@/components/auth/LoginForm';

/**
 * Login route — public chrome, UI shell only.
 * Server-rendered shell; the interactive form is a client component. Auth is
 * intentionally not wired yet (features/auth is empty), so the form validates
 * client-side via Zod and shows a graceful "auth not yet wired" notice.
 */
export default function LoginPage() {
  const t = useTranslations('Login');

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary font-sans flex flex-col">
      <Navbar variant="public" />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.01em] leading-[1.25] text-text-primary">
              {t('title')}
            </h1>
            <p className="text-sm text-text-muted">{t('subtitle')}</p>
          </div>

          <div className="bg-surface-1 border border-border-1 rounded-xl p-6 md:p-8">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
