import { useEffect, useState } from 'react';
import { subscribeToApi } from '../lib/apiSubscription';

export function usePaginatedFeed(path) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState({ offset: 0, revision: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const feed = subscribeToApi(`${path}?limit=100&offset=${page.offset}`, {
      onData(data, response) {
        setLoading(false);
        if (!response.ok || !Array.isArray(data)) {
          setError('Failed to load content. Please try again.');
          return;
        }
        setItems((previous) =>
          page.offset === 0
            ? data
            : [...previous, ...data.filter((row) => !previous.some((item) => item._id === row._id))]
        );
        setHasMore(response.headers.get('X-Has-More') === 'true' && page.offset < 10000);
        setError('');
      },
      onError() {
        setLoading(false);
        setError('Failed to load content. Please try again.');
      }
    });
    return () => feed.unsubscribe();
  }, [path, page]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadMore() {
      if (loading || !hasMore) return;
      setLoading(true);
      setPage((previous) => ({ ...previous, offset: previous.offset + 100 }));
    },
    refresh() {
      setLoading(true);
      setPage((previous) => ({ offset: 0, revision: previous.revision + 1 }));
    }
  };
}
