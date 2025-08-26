// Template for fixing React Router unmounting issues in CapitalRx shell modules
// This shows the recommended pattern for stable routing with context preservation

import React, { FC, useMemo, useCallback, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useModulePathResolver } from 'capitalrx-shell';

// Import your context and debugging utilities
import { useStableRoutes, useRouteUnmountDebugger, StableContextProvider } from './map-esm-deps.js';

// Example context - replace with your actual context
interface MyAppContextValue {
  data: any;
  setData: (data: any) => void;
  currentPath: string;
}

const MyAppContext = React.createContext<MyAppContextValue | null>(null);

// Create a single, stable QueryClient instance at the module level
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Example route configuration - replace with your actual routes
const routeConfig = [
  { path: "/", Component: () => <Navigate to="/root" replace /> },
  { path: "/root", Component: RootComponent },
  { path: "/root/sub_path", Component: SubComponent },
  { path: "/root/sub_path/detail", Component: DetailComponent },
];

// Your actual route components
function RootComponent() {
  const debugInfo = useRouteUnmountDebugger('RootComponent');
  const context = useContext(MyAppContext);
  
  return (
    <div>
      <h2>Root Component</h2>
      <p>Render count: {debugInfo.renderCount}</p>
      <p>Current data: {JSON.stringify(context?.data)}</p>
    </div>
  );
}

function SubComponent() {
  const debugInfo = useRouteUnmountDebugger('SubComponent');
  return (
    <div>
      <h2>Sub Component</h2>
      <p>Render count: {debugInfo.renderCount}</p>
    </div>
  );
}

function DetailComponent() {
  const debugInfo = useRouteUnmountDebugger('DetailComponent');
  return (
    <div>
      <h2>Detail Component</h2>
      <p>Render count: {debugInfo.renderCount}</p>
    </div>
  );
}

// Inner component that handles the actual routing
const AppRoutesInner: FC = () => {
  const location = useLocation();
  const resolve = useModulePathResolver();
  
  // Stabilize routes to prevent recreating route array on each render
  const stableRoutes = useStableRoutes(routeConfig);
  
  // Context state management
  const [appData, setAppData] = React.useState(null);
  
  // Stable context value to prevent context recreation
  const contextValue = useMemo(() => ({
    data: appData,
    setData: setAppData,
    currentPath: location.pathname
  }), [appData, location.pathname]);
  
  // Log route changes for debugging
  React.useEffect(() => {
    console.log(`[Route Change] Navigation to: ${location.pathname}`);
  }, [location.pathname]);
  
  return (
    <StableContextProvider value={contextValue} contextName="MyAppContext">
      <MyAppContext.Provider value={contextValue}>
        {/* Place your content that shouldn't remount here */}
        <div className="app-header">
          <h1>My Module - Current Path: {location.pathname}</h1>
        </div>
        
        {/* Routes that can change without unmounting the context above */}
        <Routes>
          {stableRoutes.map(({ path, Component }) => (
            <Route 
              key={path} 
              path={path} 
              element={<Component />} 
            />
          ))}
        </Routes>
      </MyAppContext.Provider>
    </StableContextProvider>
  );
};

// Main Routes component - this is what gets exported and used by the shell
export const Routes: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutesInner />
    </QueryClientProvider>
  );
};

// Alternative pattern for more complex nested routing
export const NestedRoutesExample: FC = () => {
  const stableRoutes = useStableRoutes([
    { path: "/", Component: () => <Navigate to="/app" replace /> },
    { path: "/app/*", Component: AppShell },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {stableRoutes.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
    </QueryClientProvider>
  );
};

// App shell for nested routing
const AppShell: FC = () => {
  const [appState, setAppState] = React.useState({});
  
  const contextValue = useMemo(() => ({
    state: appState,
    setState: setAppState,
  }), [appState]);

  return (
    <MyAppContext.Provider value={contextValue}>
      {/* Context preserved across nested route changes */}
      <div className="app-shell">
        <nav>Navigation that persists</nav>
        
        {/* Nested routes */}
        <Routes>
          <Route index element={<RootComponent />} />
          <Route path="sub_path" element={<SubComponent />} />
          <Route path="sub_path/detail" element={<DetailComponent />} />
        </Routes>
      </div>
    </MyAppContext.Provider>
  );
};

// Hook to use the context safely
export const useMyAppContext = () => {
  const context = useContext(MyAppContext);
  if (!context) {
    throw new Error('useMyAppContext must be used within MyAppContext.Provider');
  }
  return context;
};

export default Routes;
