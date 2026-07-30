import {useTranslations} from 'next-intl';

export default function DashboardPage() {
  const tCommon = useTranslations('Common');
  const tDashboard = useTranslations('Dashboard');
  
  return (
    <div className="flex-1 p-8 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          {tDashboard('title')}
        </h1>
        <button className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          {tDashboard('signOut')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-500 mb-2">{tCommon('MonthlyCommitment')}</h2>
          <p className="text-3xl font-bold">MYR 0.00</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-500 mb-2">{tCommon('AvailableBalance')}</h2>
          <p className="text-3xl font-bold">MYR 0.00</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-12 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">{tDashboard('emptyState')}</p>
        <button className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium py-2 px-6 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
          + {tCommon('Subscription')}
        </button>
      </div>
    </div>
  );
}
