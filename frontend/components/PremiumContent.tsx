'use client';

interface PremiumContentProps {
  title: string;
  content: string;
  publishedAt?: string;
}

export default function PremiumContent({ title, content, publishedAt }: PremiumContentProps) {
  return (
    <article className="rsk-card p-6">
      <h1 className="mb-2 text-2xl font-semibold text-rsk-text">{title}</h1>
      {publishedAt && (
        <p className="mb-4 text-sm text-rsk-muted">
          {new Date(publishedAt).toLocaleDateString()}
        </p>
      )}
      <div className="max-w-none whitespace-pre-wrap text-sm leading-6 text-rsk-text/90">
        {content}
      </div>
    </article>
  );
}
