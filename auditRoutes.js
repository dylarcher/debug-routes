// ESM Dependencies Mapping Tool for React Router Unmount Issues
// This tool helps diagnose and fix React Router unmounting problems in the CapitalRx shell system
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Stable Route Context to prevent unnecessary remounts
 */
const StableRouteContext = createContext(null);

/**
 * Hook to create memoized routes that won't cause remounts
 */
export const useStableRoutes = (routes) => {
  return useMemo(() => routes, [JSON.stringify(routes.map((r) => ({ path: r.path, component: r.Component?.name })))]);
};

/**
 * Hook to detect route unmounts and provide debugging info
 */
export const useRouteUnmountDebugger = (componentName) => {
  const location = useLocation();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`[Route Debug] ${componentName} mounted at ${location.pathname} (render #${renderCountRef.current})`);

    return () => {
      const lifespan = Date.now() - mountTimeRef.current;
      console.log(`[Route Debug] ${componentName} unmounted after ${lifespan}ms`);
    };
  }, [location.pathname, componentName]);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    renderCountRef.current = 0;
  }, []);

  return {
    renderCount: renderCountRef.current,
    lifespan: Date.now() - mountTimeRef.current,
  };
};

/**
 * Stable Context Provider that prevents context recreation on route changes
 */
export const StableContextProvider = ({ children, value, contextName = "StableContext" }) => {
  const stableValue = useMemo(() => value, [JSON.stringify(value)]);

  useEffect(() => {
    console.log(`[Context Debug] ${contextName} context created/updated`);
    return () => console.log(`[Context Debug] ${contextName} context destroyed`);
  }, [stableValue, contextName]);

  return <StableRouteContext.Provider value={stableValue}>{children}</StableRouteContext.Provider>;
};

/**
 * Enhanced Route Wrapper that prevents unmounts during navigation
 */
export const StableRoute = ({ path, element, contextValue, ...props }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const stableNavigate = useCallback(
    (to, options = {}) => {
      console.log(`[Route Debug] Navigating from ${location.pathname} to ${to}`);
      navigate(to, options);
    },
    [navigate, location.pathname],
  );

  const enhancedContext = useMemo(
    () => ({
      ...contextValue,
      navigate: stableNavigate,
      currentPath: location.pathname,
    }),
    [contextValue, stableNavigate, location.pathname],
  );

  return (
    <StableContextProvider value={enhancedContext} contextName={`Route-${path}`}>
      {element}
    </StableContextProvider>
  );
};

/**
 * Analyzer for detecting route configuration issues
 */
export const analyzeRouteConfiguration = (routes, modules) => {
  const issues = [];

  // Check for dynamic route array recreation
  const routeHashes = routes.map((route) => ({
    path: route.path,
    componentName: route.Component?.name,
    hasStableKey: !!route.key,
  }));

  routeHashes.forEach((route, index) => {
    if (!route.hasStableKey) {
      issues.push({
        type: "missing-stable-key",
        route: route.path,
        message: `Route ${route.path} missing stable key, may cause remounts`,
      });
    }

    if (!route.componentName) {
      issues.push({
        type: "anonymous-component",
        route: route.path,
        message: `Route ${route.path} uses anonymous component, debugging difficult`,
      });
    }
  });

  // Check for shell module configuration issues
  if (modules) {
    modules.forEach((module) => {
      if (module.version === undefined) {
        issues.push({
          type: "missing-module-version",
          module: module.info?.id,
          message: `Module ${module.info?.id} missing version, may cause AsyncWrapper issues`,
        });
      }
    });
  }

  return issues;
};

/**
 * ESM Dependencies mapping for debugging
 */
export const mapESMDependencies = () => {
  const dependencies = {
    // Core routing dependencies
    "react-router": {
      version: "6.x",
      critical: true,
      shellPatched: true,
      patchedComponents: ["Switch -> ShellSwitch"],
    },
    "react-router-dom": {
      version: "6.x",
      critical: true,
      components: ["BrowserRouter", "Routes", "Route", "Navigate", "useNavigate", "useLocation"],
    },
    "@tanstack/react-query": {
      version: "5.x",
      critical: false,
      issue: "Multiple QueryClient instances may cause state loss",
    },
    "capitalrx-shell": {
      version: "latest",
      critical: true,
      components: ["Shell", "AsyncWrapper", "useModulePathResolver", "ShellSwitch"],
    },
  };

  return dependencies;
};

/**
 * Quick diagnostic function for route unmount issues
 */
export const diagnoseUnmountIssues = (routeConfig) => {
  const diagnosis = {
    issues: [],
    recommendations: [],
    severity: "low",
  };

  // Check for common patterns that cause unmounts
  if (routeConfig.hasActivityContext) {
    diagnosis.issues.push("ActivityContext tracking navigation changes");
    diagnosis.recommendations.push("Move ActivityContext below module routing level");
  }

  if (routeConfig.hasBlockedNavigation) {
    diagnosis.issues.push("BlockedNavigation intercepting navigation");
    diagnosis.recommendations.push("Check BlockedNavigation placement and when conditions");
  }

  if (routeConfig.hasMultipleQueryClients) {
    diagnosis.issues.push("Multiple QueryClient instances detected");
    diagnosis.recommendations.push("Share single QueryClient instance across routes");
    diagnosis.severity = "high";
  }

  if (routeConfig.hasUnmemoizedRoutes) {
    diagnosis.issues.push("Route array recreated on each render");
    diagnosis.recommendations.push("Wrap routes in useMemo with stable dependencies");
    diagnosis.severity = "medium";
  }

  return diagnosis;
};

// Export for debugging in browser console
if (typeof window !== "undefined") {
  window.CapitalRxRouteDebugger = {
    analyzeRouteConfiguration,
    mapESMDependencies,
    diagnoseUnmountIssues,
  };
}
