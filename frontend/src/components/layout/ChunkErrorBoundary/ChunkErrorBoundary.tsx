import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ChunkErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkLoadError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isChunkLoadError: false,
  };

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('simulate_chunk_error') === 'true') {
        const simErr = new Error('Failed to fetch dynamically imported module /assets/BookDetailPage-chunk.js');
        simErr.name = 'ChunkLoadError';
        this.setState({
          hasError: true,
          error: simErr,
          isChunkLoadError: true,
        });
      }
    }
  }

  public static getDerivedStateFromError(error: Error): State {
    const isChunk =
      error.name === 'ChunkLoadError' ||
      /loading chunk/i.test(error.message) ||
      /failed to fetch dynamically imported module/i.test(error.message) ||
      /error loading dynamically imported module/i.test(error.message);

    return {
      hasError: true,
      error,
      isChunkLoadError: isChunk,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    // If it is a chunk load error, clear cache flag and reload safely without loops
    if (this.state.isChunkLoadError && typeof window !== 'undefined') {
      const retryKey = 'akashic_chunk_retry_timestamp';
      const lastRetry = sessionStorage.getItem(retryKey);
      const now = Date.now();

      if (lastRetry && now - parseInt(lastRetry, 10) < 6000) {
        // Prevent rapid infinite reload loops
        this.setState({ hasError: false, error: null });
        return;
      }

      sessionStorage.setItem(retryKey, String(now));
      window.location.reload();
      return;
    }

    // Otherwise reset error state to attempt re-rendering
    this.setState({ hasError: false, error: null });
  };

  private handleHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkLoadError;
      return (
        <div
          className={styles.errorCard}
          role="alert"
          aria-live="assertive"
          data-testid="chunk-error-boundary"
        >
          <div className={styles.iconWrapper} aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className={styles.title}>
            {isChunk
              ? 'Archival Module Retrieval Interrupted'
              : 'Scholarly Folio Render Interrupted'}
          </h2>
          <p className={styles.message}>
            {isChunk
              ? 'A newer version of the library archive is available or your network connection was temporarily interrupted while retrieving this volume. Reloading will synchronize your reading session.'
              : 'An unexpected discrepancy occurred while rendering this library view. You may retry accessing the folio or return to the main archive.'}
          </p>
          <div className={styles.actionGroup}>
            <button
              type="button"
              className={styles.retryButton}
              onClick={this.handleRetry}
              data-testid="chunk-retry-button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Retry Retrieval
            </button>
            <button
              type="button"
              className={styles.homeButton}
              onClick={this.handleHome}
              data-testid="chunk-home-button"
            >
              Return to Catalog
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
