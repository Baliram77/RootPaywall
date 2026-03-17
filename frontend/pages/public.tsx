import { useEffect, useState } from 'react';
import { fetchPublicArticle } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Skeleton, Spinner } from '@/components/ui/Loader';

export default function PublicPage() {
  const [article, setArticle] = useState<{ title: string; content: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicArticle()
      .then(setArticle)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-rsk-muted">
          <Spinner className="border-rsk-primary" />
          Fetching public content…
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rsk-error/30 bg-rsk-error/10 p-5 text-rsk-error">
        <p className="text-sm font-semibold">Failed to load public content</p>
        <p className="mt-1 text-sm opacity-90">
          {error}. Make sure the backend is running at{' '}
          <span className="text-rsk-text">{process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}</span>.
        </p>
      </div>
    );
  }

  if (!article) return null;

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-rsk-text">{article.title}</h1>
        <p className="text-sm text-rsk-muted">Type: {article.type}</p>
      </div>
      <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-rsk-text/90">
        {article.content}
      </div>
    </Card>
  );
}
