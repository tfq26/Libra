/**
 * Global error handler for Vue application
 */

export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.handled = false;
  }
}

// Common error codes and messages
const ERROR_CODES = {
  // Client errors (4xx)
  400: { message: 'Bad Request', description: 'The server cannot process the request due to a client error.' },
  401: { message: 'Unauthorized', description: 'Authentication is required to access this resource.' },
  403: { message: 'Forbidden', description: 'You do not have permission to access this resource.' },
  404: { message: 'Not Found', description: 'The requested resource could not be found.' },
  429: { message: 'Too Many Requests', description: 'You have sent too many requests. Please try again later.' },
  
  // Server errors (5xx)
  500: { message: 'Internal Server Error', description: 'An unexpected error occurred on the server.' },
  502: { message: 'Bad Gateway', description: 'The server received an invalid response from the upstream server.' },
  503: { message: 'Service Unavailable', description: 'The server is currently unavailable.' },
  504: { message: 'Gateway Timeout', description: 'The server did not receive a timely response from the upstream server.' },
  
  // Custom errors
  NETWORK_ERROR: { message: 'Network Error', description: 'Unable to connect to the server. Please check your internet connection.' },
  TIMEOUT: { message: 'Request Timeout', description: 'The request took too long to complete.' },
  UNKNOWN: { message: 'Unknown Error', description: 'An unknown error occurred.' }
};

/**
 * Handle API errors consistently
 */
export function handleApiError(error) {
  console.error('API Error:', error);
  
  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new AppError(
        'The request timed out. Please try again.',
        'TIMEOUT',
        { originalError: error }
      );
    }
    
    return new AppError(
      'Unable to connect to the server. Please check your internet connection.',
      'NETWORK_ERROR',
      { originalError: error }
    );
  }
  
  // Handle HTTP errors
  const status = error.response.status;
  const errorInfo = ERROR_CODES[status] || ERROR_CODES[500];
  
  return new AppError(
    error.response.data?.message || errorInfo.message,
    `HTTP_${status}`,
    {
      status,
      response: error.response.data,
      originalError: error
    }
  );
}

/**
 * Handle navigation errors
 */
export function handleRouterError(error) {
  console.error('Router Error:', error);
  
  if (error.name === 'NavigationDuplicated') {
    return; // Ignore navigation duplicates
  }
  
  return new AppError(
    'Failed to navigate to the requested page.',
    'NAVIGATION_ERROR',
    { originalError: error }
  );
}

/**
 * Setup global error handlers
 */
export function setupErrorHandlers(app) {
  // Handle Vue errors
  app.config.errorHandler = (err, vm, info) => {
    console.error('Vue Error:', { err, vm, info });
    // You can add reporting to your error tracking service here
    // e.g., Sentry.captureException(err, { component: vm?.$options?.name, info });
    
    // Mark error as handled
    if (err && typeof err === 'object') {
      err.handled = true;
    }
    
    // Rethrow to allow other error handlers to process it
    throw err;
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
    
    // Mark error as handled
    if (event.reason && typeof event.reason === 'object') {
      event.reason.handled = true;
    }
    
    // Prevent the default browser handler
    event.preventDefault();
  });
  
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    console.error('Uncaught Error:', event.error);
    
    // Mark error as handled
    if (event.error && typeof event.error === 'object') {
      event.error.handled = true;
    }
    
    // Prevent the default browser handler
    event.preventDefault();
    return true;
  });
}

/**
 * Creates a navigation function that is aware of the Vue router instance.
 * @param {object} router - The Vue Router instance.
 * @returns {function} A function to navigate to the error page.
 */
export function createErrorNavigator(router) {
  /**
   * Programmatically navigates to the error page with details.
   */
  return function navigateToError(error = {}) {
    return router.push({
      name: 'Error', // Make sure you have a route with this name
      query: {
        code: error.code || error.statusCode || 500,
        message: error.message || 'An unexpected error occurred',
        error: error.name || 'UNKNOWN_ERROR',
        details: import.meta.env.DEV ? (error.details || error.stack) : undefined
      }
    });
  };
}

// Export all error codes for easy access
export { ERROR_CODES };
