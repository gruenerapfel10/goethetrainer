'use client';

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  useCallback,
  useEffect,
} from 'react';

// Define the type for a logo
interface Logo {
  id: string;
  url: string;
  name?: string;
  isActive: boolean;
  uploadedAt?: number;
}

// Define the state structure for the logo context
interface LogoState {
  currentLogo: Logo | null;
  availableLogos: Logo[];
  isLoading: boolean;
  error: string | null;
  defaultLogoUrl: string;
}

// Define the possible actions for the reducer
type LogoAction =
  | { type: 'SET_CURRENT_LOGO'; payload: Logo }
  | { type: 'SET_AVAILABLE_LOGOS'; payload: Logo[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_LOGO'; payload: Logo }
  | { type: 'REMOVE_LOGO'; payload: string } // id of the logo to remove
  | { type: 'CLEAR_STATE' };

// Define the context type
interface LogoContextType {
  state: LogoState;
  setCurrentLogo: (logo: Logo) => void;
  setAvailableLogos: (logos: Logo[]) => void;
  addLogo: (logo: Logo) => void;
  removeLogo: (logoId: string) => void;
  refreshLogos: () => Promise<void>;
  clearState: () => void;
}

// Initial state
const initialState: LogoState = {
  currentLogo: null,
  availableLogos: [],
  isLoading: false,
  error: null,
  defaultLogoUrl: '/moterra-logo.svg', // Default logo URL
};

// Default logo factory
const createDefaultLogo = (url: string): Logo => ({
  id: 'default',
  url,
  isActive: true,
});

// Create the reducer function
function logoReducer(state: LogoState, action: LogoAction): LogoState {
  switch (action.type) {
    case 'SET_CURRENT_LOGO':
      return {
        ...state,
        currentLogo: action.payload,
      };
    case 'SET_AVAILABLE_LOGOS':
      return {
        ...state,
        availableLogos: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'ADD_LOGO':
      // Check if logo already exists
      if (state.availableLogos.some((logo) => logo.id === action.payload.id)) {
        return {
          ...state,
          availableLogos: state.availableLogos.map((logo) =>
            logo.id === action.payload.id ? action.payload : logo
          ),
        };
      }
      return {
        ...state,
        availableLogos: [...state.availableLogos, action.payload],
      };
    case 'REMOVE_LOGO': {
      // Check if the logo being removed is the current logo
      const isRemovingCurrentLogo = state.currentLogo?.id === action.payload;
      const defaultLogo = createDefaultLogo(state.defaultLogoUrl);

      return {
        ...state,
        availableLogos: state.availableLogos.filter(
          (logo) => logo.id !== action.payload
        ),
        // If current logo is removed, set to defaultLogoUrl
        currentLogo: isRemovingCurrentLogo ? defaultLogo : state.currentLogo,
      };
    }
    case 'CLEAR_STATE':
      return initialState;
    default:
      return state;
  }
}

// Create the context
const LogoContext = createContext<LogoContextType | undefined>(undefined);

// Create provider component
export function LogoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(logoReducer, initialState);

  // Define action dispatchers
  const setCurrentLogo = useCallback((logo: Logo) => {
    dispatch({ type: 'SET_CURRENT_LOGO', payload: logo });

    fetch('/api/current-logo/set-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: logo.url }),
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to update active logo in the database',
        });
      }
    });
  }, []);

  const setAvailableLogos = useCallback((logos: Logo[]) => {
    dispatch({ type: 'SET_AVAILABLE_LOGOS', payload: logos });
  }, []);

  const addLogo = useCallback((logo: Logo) => {
     // Make sure newly added logos are not automatically set as active
    const logoToAdd = {
      ...logo,
      isActive: false, // Ensure new logos are not active by default
    };
    dispatch({ type: 'ADD_LOGO', payload: logoToAdd });
  }, []);

  const removeLogo = useCallback(
    async (logoId: string) => {
      const logoToRemove = state.availableLogos.find(
        (logo) => logo.id === logoId
      );

      if (logoToRemove) {
        try {
  // Always remove from database regardless of whether it's active or not
          await fetch(
            `/api/logos/remove?url=${encodeURIComponent(logoToRemove.url)}`,
            {
              method: 'DELETE',
            }
          );

          // Remove the logo file from S3/storage
          await fetch(`/api/logos/delete?key=${encodeURIComponent(logoId)}`, {
            method: 'DELETE',
          });

            // Check if we're removing the active logo
          if (state.currentLogo?.id === logoId) {
            await fetch('/api/current-logo/set-active', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: state.defaultLogoUrl }),
            });
          }

          dispatch({ type: 'REMOVE_LOGO', payload: logoId });
        } catch (error) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to delete logo',
          });
        }
      }
    },
    [state.availableLogos, state.currentLogo, state.defaultLogoUrl]
  );

  const clearState = useCallback(() => {
    dispatch({ type: 'CLEAR_STATE' });
  }, []);

  const refreshLogos = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const defaultLogo = createDefaultLogo(state.defaultLogoUrl);

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Fetch the active logo
        const activeResponse = await fetch('/api/current-logo/active', {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle authentication or error responses
        if (activeResponse.status === 401 || !activeResponse.ok) {
          dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
          dispatch({ type: 'SET_AVAILABLE_LOGOS', payload: [] });
          return;
        }

        const activeData = await activeResponse.json();

        // Fetch available logos
        const logosResponse = await fetch('/api/logos/list', {
          signal: controller.signal,
        });

        // Handle authentication or error responses
        if (logosResponse.status === 401 || !logosResponse.ok) {
          dispatch({
            type: 'SET_CURRENT_LOGO',
            payload: {
              id: 'default',
              url: activeData.url || state.defaultLogoUrl,
              isActive: true,
            },
          });
          dispatch({ type: 'SET_AVAILABLE_LOGOS', payload: [] });
          return;
        }

        const logosData = await logosResponse.json();

        if (!Array.isArray(logosData.files)) {
          dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
          dispatch({ type: 'SET_AVAILABLE_LOGOS', payload: [] });
          return;
        }

        // Map logos to our format
        const logosList: Logo[] = logosData.files.map((file: any) => {
          const logoUrl = file.Url;
          return {
            id: file.Key,
            url: logoUrl,
            name: file.Key.split('/').pop() || '',
            isActive: logoUrl === activeData.url,
            uploadedAt: file.LastModified
              ? new Date(file.LastModified).getTime()
              : Date.now(),
          };
        });

        setAvailableLogos(logosList);

        // Set the active logo
        const activeLogo = logosList.find(
          (logo) => logo.url === activeData.url
        );
        if (activeLogo) {
          dispatch({ type: 'SET_CURRENT_LOGO', payload: activeLogo });
        } else if (activeData.url) {
          dispatch({
            type: 'SET_CURRENT_LOGO',
            payload: {
              id: 'default',
              url: activeData.url,
              isActive: true,
            },
          });
        } else {
          dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
        }
      } catch (error) {
        // Use default logo for any error
        dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
        dispatch({ type: 'SET_AVAILABLE_LOGOS', payload: [] });
      }
    } catch (error) {
      // Fallback to default logo in case of any errors
      dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [setAvailableLogos, state.defaultLogoUrl]);

   // Initial fetch of logos on mount
  useEffect(() => {
    const initLogos = async () => {
      try {
        await refreshLogos();
      } catch (error) {
        const defaultLogo = createDefaultLogo(state.defaultLogoUrl);
        dispatch({ type: 'SET_CURRENT_LOGO', payload: defaultLogo });
      }
    };

    initLogos();
  }, [refreshLogos, state.defaultLogoUrl]);

  return (
    <LogoContext.Provider
      value={{
        state,
        setCurrentLogo,
        setAvailableLogos,
        addLogo,
        removeLogo,
        refreshLogos,
        clearState,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
}

// Custom hook for using the logo context
export function useLogo() {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
}

// Helper hook to just get the current logo URL
export function useLogoUrl() {
  const { state } = useLogo();
  return state.currentLogo?.url || state.defaultLogoUrl;
}
