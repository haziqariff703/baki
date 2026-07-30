import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/routing';

export default function HomePage() {
  const t = useTranslations('Index');
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight text-blue-900 dark:text-blue-400 mb-4">
        {t('title')}
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl text-center">
        {t('description')}
      </p>
      
      {/* 
        This is a placeholder for the auth component.
        For M1, we are just mocking the flow.
      */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <p className="text-center text-sm mb-4">Authentication will be placed here.</p>
        <Link 
          href="/dashboard"
          className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {t('signIn')} (Mock)
        </Link>
      </div>
    </div>
  );
}
