import { useTranslations } from 'next-intl';


export default function NotFound() {
  const t = useTranslations();

  return (
    <div className="flex h-[100vh] items-center justify-center bg-background text-foreground">
      <div className="container flex max-w-md flex-col items-center justify-center space-y-6 px-4 py-8 text-center">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-primary">404</h1>
          <h2 className="text-3xl font-semibold">{t('notFound.title')}</h2>
          <p className="text-muted-foreground">{t('notFound.description')}</p>
        </div>
      </div>
    </div>
  );
}
