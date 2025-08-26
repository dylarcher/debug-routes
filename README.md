# Route Debug Toolkit - Complete Guide

**PRODUCTION-READY** - Comprehensive toolkit for troubleshooting React Router unmounting issues in the CapitalRx shell system.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Toolkit Structure](#toolkit-structure)
3. [Available npm Scripts](#available-npm-scripts)
4. [What This Toolkit Solves](#what-this-toolkit-solves)
5. [Available Tools](#available-tools)
6. [Root Cause Analysis](#root-cause-analysis)
7. [Issues Identified & Fixes Applied](#issues-identified--fixes-applied)
8. [Step-by-Step Fix Process](#step-by-step-fix-process)
9. [Code Fix Examples](#code-fix-examples)
10. [Debugging Tools](#debugging-tools)
11. [Migration Checklist](#migration-checklist)
12. [Common Patterns by Module Type](#common-patterns-by-module-type)
13. [Testing Your Fixes](#testing-your-fixes)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Integration Workflows](#integration-workflows)
16. [Team Usage](#team-usage)
17. [Additional Resources](#additional-resources)

---

## Quick Start

**Get started in 30 seconds:**

```bash
cd /path/to/your/module
npm run route-analyze-verbose    # Analyze with detailed output
npm run route-debug-help         # Show all available commands
```

### Basic Commands

```bash
# Quick analysis
npm run route-analyze               # Basic analysis of current directory
npm run route-analyze-verbose       # Detailed file-by-file analysis
npm run route-analyze-json         # JSON output for CI/CD

# Module-specific analysis
npm run route-debug-pa             # Analyze PA module
npm run route-debug-claims         # Analyze Claims module

# Get help
npm run route-debug-help           # Show analyzer help
```

---

## Available npm Scripts

All scripts are production-ready and easy to share across teams:

```bash
# Quick analysis
npm run route-analyze               # Basic analysis of current directory
npm run route-analyze-verbose       # Detailed file-by-file analysis
npm run route-analyze-json         # JSON output for CI/CD

# Module-specific analysis
npm run route-debug-pa             # Analyze PA module
npm run route-debug-claims         # Analyze Claims module

# Get help
npm run route-debug-help           # Show analyzer help
```

---

## What This Toolkit Solves

This toolkit provides comprehensive solutions for React Router unmounting issues that cause:

- **Component Unmounting**: Routes unexpectedly unmount/remount on navigation
- **Context State Loss**: Application context is destroyed during route changes
- **Screen Flashing**: Entire UI reloads when navigating between sub-routes
- **Performance Issues**: Excessive re-renders and API calls during navigation
- **Module Instability**: Shell module boundaries interfering with routing

### Detection Categories

**Detects 9 categories of issues that cause React Router component unmounting:**

- **High Severity**: Dynamic route generation, context above Routes, QueryClient recreation
- **Medium Severity**: Shell hook issues, ActivityContext problems
- **Low Severity**: Missing memoization, performance patterns

---

## Available Tools

### 1. Route Analyzer (`route-analyzer.js`)

**Enhanced CLI tool** that scans your codebase for routing issues.

```bash
node src/helpers/route-analyzer.js [path] [options]

OPTIONS:
  -v, --verbose    Show detailed file-by-file analysis
  -j, --json       Output results as JSON
  -h, --help       Show help message
```

**Features:**

- Enhanced CLI interface with progress indicators
- Better error handling and file statistics
- Severity categorization (High, Medium, Low)
- CI/CD ready with exit codes and JSON output
- 9 categories of issue detection including performance patterns

### 2. Runtime Debugger (`map-esm-deps.js`)

React hooks and utilities for runtime debugging.

```typescript
import { useRouteUnmountDebugger, useStableRoutes } from "./map-esm-deps.js";

// Debug route unmounting in real-time
useRouteUnmountDebugger("MyModule");

// Stabilize route arrays
const stableRoutes = useStableRoutes(routes);
```

### 3. Browser Diagnostic Tool (`route-debugger.html`)

Interactive browser tool for debugging route issues.

### 4. Fix Templates

- `PARoutes.fix.tsx` - Working PA module implementation
- `RouteFixModal.tsx` - Generic fix patterns

---

## Root Cause Analysis

### Primary Issues Identified

#### 1. **Shell-Level Route Management**

The `capitalrx-shell` system has complex route handling that manages modules dynamically and may cause remounts. The `Routes.tsx` uses `AsyncWrapper` components that could be recreating components on route changes:

```js
<AsyncWrapper resolver={containerProvider}>
  <AsyncWrapper resolver={indexProvider} />
</AsyncWrapper>
```

#### 2. **QueryClient Recreation**

**Problem**: New QueryClient instances created in route components

```typescript
// WRONG - Creates new client on each render
const RouteComponent = () => {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>;
}
```

**Solution**: Move to module level

```typescript
// CORRECT - Single instance at module level
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 300000 },
  },
});
```

#### 3. **Context Placement Above Routes**

**Problem**: Context providers placed above shell routing level

```typescript
// WRONG - Context lost on shell route changes
<ActivityContextProvider>
  <Shell>
    <Routes>...</Routes>
  </Shell>
</ActivityContextProvider>
```

**Solution**: Move context inside module routing

```typescript
// CORRECT - Context preserved during navigation
<QueryClientProvider client={queryClient}>
  <Routes>
    <Route path="/*" element={<ActivityContextProvider>...</ActivityContextProvider>} />
  </Routes>
</QueryClientProvider>
```

#### 4. **Dynamic Route Array Recreation**

**Problem**: Route arrays recreated on each render

```typescript
// WRONG - New array every render
const Component = () => {
  const routes = routeConfig.filter(condition);
  return <Routes>{routes.map(...)}</Routes>;
}
```

**Solution**: Memoize route arrays

```typescript
// CORRECT - Stable route references
const Component = () => {
  const stableRoutes = useStableRoutes(
    useMemo(() => routeConfig.filter(condition), [dependencies])
  );
  return <Routes>{stableRoutes.map(...)}</Routes>;
}
```

---

## Issues Identified & Fixes Applied

### 1. QueryClient Recreation Issue

**Problem**: QueryClient instances created inside route components cause state loss on route changes.

**Fix**: Move QueryClient to module level

```typescript
// BEFORE: Inside route component
const PARoutesComponent = () => {
  const queryClient = new QueryClient({ ... });
  // Routes recreate this on each render
}

// AFTER: Module level
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: STALE_TIME,
    },
  },
});
```

### 2. ActivityContext Placement Issue

**Problem**: ActivityContext placed above route level causes context to be destroyed on navigation.

**Fix**: Move ActivityContext inside the routing structure

```typescript
// BEFORE: Above routes
<ActivityContextProvider>
  <Shell>
    <Routes>
      {/* Context lost on route changes */}
    </Routes>
  </Shell>
</ActivityContextProvider>

// AFTER: Inside route structure
<QueryClientProvider>
  <Routes>
    <Route path="/*" element={
      <ActivityContextProvider>
        {/* Context preserved during navigation */}
        <InnerRoutes />
      </ActivityContextProvider>
    } />
  </Routes>
</QueryClientProvider>
```

### 3. Unmemoized Route Arrays

**Problem**: Route arrays recreated on each render cause React to unmount/remount all routes.

**Fix**: Memoize route configurations

```typescript
// BEFORE: Array recreated each render
const PARoutesComponent = () => {
  const routes = routeConfig.filter(/* some condition */);
  return (
    <Routes>
      {routes.map(route => <Route key={route.path} ... />)}
    </Routes>
  );
}

// AFTER: Stabilized with useMemo
const PARoutesComponent = () => {
  const stableRoutes = useStableRoutes(
    useMemo(() => routeConfig.filter(/* condition */), [/* dependencies */])
  );
  return (
    <Routes>
      {stableRoutes.map(route => <Route key={route.path} ... />)}
    </Routes>
  );
}
```

### 4. Expensive Computation on Each Render

**Problem**: Complex breadcrumb calculations on every render cause performance issues.

**Fix**: Memoize computed values

```typescript
// BEFORE: Calculated on each render
const PARoutesComponent = () => {
  const currPathList = pathname.split("/");
  const queueName = formatCapStrWords(currPathList[4]);
  // ... complex calculations
}

// AFTER: Memoized calculations
const PARoutesComponent = () => {
  const pathInfo = useMemo(() => {
    const currPathList = pathname.split("/");
    return {
      currPathList,
      path3: currPathList[3],
      path4: currPathList[4],
      // ... other derived values
    };
  }, [pathname]);

  const breadcrumbData = useMemo(() => {
    // Complex calculations only when dependencies change
    return {
      queueNameWithoutCase: formatCapStrWords(pathInfo.path4),
      // ... other computations
    };
  }, [pathInfo, caseData, /* other dependencies */]);
}
```

---

## Step-by-Step Fix Process

### Phase 1: Analysis & Discovery

#### 1.1 Run Automated Analysis

```bash
cd /path/to/your/module
node /path/to/helpers/route-analyzer.js src/
```

#### 1.2 Manual Code Review Checklist

- [ ] **QueryClient Creation**: Search for `new QueryClient`
- [ ] **Context Providers**: Check placement relative to `<Routes>`
- [ ] **Route Mapping**: Look for `routes.map()` without memoization
- [ ] **ActivityContext**: Verify proper placement
- [ ] **BlockedNavigation**: Check for navigation interceptors

#### 1.3 Browser Testing

- [ ] Open React DevTools Profiler
- [ ] Navigate between routes and record
- [ ] Look for unexpected unmount/mount cycles
- [ ] Check Network tab for duplicate API calls

### Phase 2: Critical Fixes

#### 2.1 Fix QueryClient (HIGH PRIORITY)

```typescript
// Step 1: Move QueryClient to module level
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {...},
  },
});

// Step 2: Wrap at module boundary
export const Routes: FC = () => (
  <QueryClientProvider client={queryClient}>
    <AppRoutesInner />
  </QueryClientProvider>
);
```

#### 2.2 Fix Context Placement (HIGH PRIORITY)

```typescript
// Step 1: Create inner component for context
const AppRoutesInner: FC = () => {
  const stableRoutes = useStableRoutes(routeConfig);

  return (
    <ActivityContextProvider>
      {/* Routes go here */}
    </ActivityContextProvider>
  );
};
```

### Phase 3: Performance Optimization

#### 3.1 Stabilize Route Arrays

```typescript
const MyRoutes: FC = () => {
  // Memoize filtered routes
  const filteredRoutes = useMemo(() =>
    routeConfig.filter(route => shouldShowRoute(route)),
    [/* stable dependencies */]
  );

  // Use stability hook
  const stableRoutes = useStableRoutes(filteredRoutes);

  return (
    <Routes>
      {/* Routes here */}
    </Routes>
  );
};
```

#### 3.2 Optimize Expensive Calculations

```typescript
const MyComponent: FC = () => {
  const { pathname } = useLocation();

  // Memoize path parsing
  const pathInfo = useMemo(() => {
    // Path parsing logic here
  }, [pathname /* other dependencies */]);
};
```

### Phase 4: Debugging Integration

#### 4.1 Add Debug Hooks (Development Only)

```typescript
function MyComponent() {
  const debugInfo = useRouteUnmountDebugger('MyComponent');
  return <div>...</div>;
}
```

#### 4.2 Browser Console Diagnostics

```javascript
// Run in browser console
window.CapitalRxRouteDebugger.diagnoseUnmountIssues({
  hasActivityContext: true,
  hasUnmemoizedRoutes: false,
});
```

### Phase 5: Testing & Validation

#### 5.1 Functional Testing Checklist

- [ ] **Navigation**: All route transitions work without screen flash
- [ ] **State Persistence**: Context values preserved during navigation
- [ ] **Performance**: No duplicate API calls in Network tab
- [ ] **Console**: No unexpected unmount warnings

---

## Code Fix Examples

### RouteFixModal.tsx - Generic Fix Pattern

This template shows the complete fix pattern for any module:

```typescript
import React, { FC, useMemo } from 'react';
import { Routes, Route, QueryClient, QueryClientProvider } from 'react-router-dom';
import { useStableRoutes } from './map-esm-deps';

// 1. Move QueryClient to module level (CRITICAL)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

// 2. Define your route configuration (stable reference)
const routeConfig = [
  {
    path: '/dashboard',
    Component: React.lazy(() => import('./Dashboard')),
    requiresAuth: true,
  },
  {
    path: '/settings',
    Component: React.lazy(() => import('./Settings')),
    requiresAuth: true,
  },
  // Add more routes here
];

// 3. Inner component handles context and routing
const AppRoutesInner: FC = () => {
  // Memoize route filtering/processing
  const processedRoutes = useMemo(() => {
    return routeConfig.filter(route => {
      // Apply any filtering logic here
      return route.requiresAuth; // Example condition
    });
  }, [/* add dependencies here */]);

  // Use stable routes hook to prevent remounting
  const stableRoutes = useStableRoutes(processedRoutes);

  return (
    <YourContextProvider>
      <Routes>
        {stableRoutes.map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <Component />
              </React.Suspense>
            }
          />
        ))}
        <Route path="*" element={<NotFoundComponent />} />
      </Routes>
    </YourContextProvider>
  );
};

// 4. Main export provides QueryClient at module boundary
export const RouteFixModal: FC = () => (
  <QueryClientProvider client={queryClient}>
    <AppRoutesInner />
  </QueryClientProvider>
);

// 5. Optional: Context provider with stable value
const YourContextProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const contextValue = useMemo(() => ({
    // Memoize context value to prevent unnecessary re-renders
    someValue: 'stable value',
    // Add other context values here
  }), [/* dependencies */]);

  return (
    <YourContext.Provider value={contextValue}>
      {children}
    </YourContext.Provider>
  );
};

export default RouteFixModal;
```

### PARoutes.fix.tsx - PA Module Specific Implementation

This shows how the fix pattern applies to the PA module specifically:

```typescript
import React, { FC, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStableRoutes } from '../helpers/map-esm-deps';
import { ActivityContextProvider } from './context/ActivityContext';
import { formatCapStrWords } from './utils';

// Move QueryClient to module level
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
    },
  },
});

// PA-specific route configuration
const PA_ROUTES = [
  {
    path: '/pa/dashboard',
    component: 'PADashboard',
    requiresCase: false,
  },
  {
    path: '/pa/queue/:queueId',
    component: 'PAQueue',
    requiresCase: false,
  },
  {
    path: '/pa/case/:caseId/*',
    component: 'PACase',
    requiresCase: true,
  },
  // Add more PA routes
];

const PARoutesInner: FC = () => {
  const { pathname } = useLocation();

  // Memoize path parsing (was causing expensive re-calculations)
  const pathInfo = useMemo(() => {
    const currPathList = pathname.split("/");
    return {
      currPathList,
      path3: currPathList[3], // queue type
      path4: currPathList[4], // queue/case id
      isQueueRoute: currPathList[3] === 'queue',
      isCaseRoute: currPathList[3] === 'case',
    };
  }, [pathname]);

  // Memoize breadcrumb data (was recalculating on every render)
  const breadcrumbData = useMemo(() => {
    if (!pathInfo.path4) return null;

    return {
      queueNameWithoutCase: formatCapStrWords(pathInfo.path4),
      // Add other breadcrumb calculations
    };
  }, [pathInfo]);

  // Memoize filtered routes based on current context
  const filteredRoutes = useMemo(() => {
    return PA_ROUTES.filter(route => {
      if (route.requiresCase && !pathInfo.isCaseRoute) {
        return false;
      }
      return true;
    });
  }, [pathInfo]);

  // Use stable routes to prevent remounting
  const stableRoutes = useStableRoutes(filteredRoutes);

  return (
    <ActivityContextProvider
      breadcrumbData={breadcrumbData}
      pathInfo={pathInfo}
    >
      <Routes>
        {stableRoutes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={<RouteComponentResolver component={route.component} />}
          />
        ))}
        <Route path="*" element={<PANotFound />} />
      </Routes>
    </ActivityContextProvider>
  );
};

// Main PA Routes component
export const PARoutes: FC = () => (
  <QueryClientProvider client={queryClient}>
    <PARoutesInner />
  </QueryClientProvider>
);

// Helper component for dynamic route resolution
const RouteComponentResolver: FC<{ component: string }> = ({ component }) => {
  const Component = useMemo(() => {
    // Lazy load components based on component name
    switch (component) {
      case 'PADashboard':
        return React.lazy(() => import('./components/PADashboard'));
      case 'PAQueue':
        return React.lazy(() => import('./components/PAQueue'));
      case 'PACase':
        return React.lazy(() => import('./components/PACase'));
      default:
        return () => <div>Component not found: {component}</div>;
    }
  }, [component]);

  return (
    <React.Suspense fallback={<PALoadingSpinner />}>
      <Component />
    </React.Suspense>
  );
};

export default PARoutes;
```

### Key Fix Points Demonstrated

1. **QueryClient at Module Level**: Both examples show QueryClient created outside components
2. **Context Placement**: ActivityContext placed inside routing structure, not above it
3. **Route Memoization**: Both use `useStableRoutes` and `useMemo` for route stability
4. **Expensive Calculation Optimization**: PA example shows memoized path parsing and breadcrumb data
5. **Proper Component Structure**: Clear separation between provider setup and routing logic

---

## Debugging Tools

### 1. Route Unmount Debugger

Use `useRouteUnmountDebugger` to track component lifecycle:

```typescript
function MyComponent() {
  const debugInfo = useRouteUnmountDebugger('MyComponent');

  return (
    <div>
      <p>Render count: {debugInfo.renderCount}</p>
      <p>Lifespan: {debugInfo.lifespan}ms</p>
    </div>
  );
}
```

### 2. Stable Routes Hook

Use `useStableRoutes` to prevent route array recreation:

```typescript
const routes = useStableRoutes([
  { path: "/dashboard", Component: Dashboard },
  { path: "/settings", Component: Settings },
]);
```

### 3. Stable Context Provider

Use `StableContextProvider` for debugging context recreation:

```typescript
<StableContextProvider value={contextValue} contextName="MyContext">
  {children}
</StableContextProvider>
```

---

## Migration Checklist

When updating a module's routing:

### Pre-Migration

- [ ] Run route analyzer on current code
- [ ] Document existing route structure
- [ ] Identify all context providers
- [ ] Note any custom navigation logic

### During Migration

- [ ] Apply QueryClient fix first
- [ ] Move context providers to correct level
- [ ] Add route array memoization
- [ ] Implement debugging hooks
- [ ] Test each change incrementally

### Post-Migration

- [ ] Verify all routes work correctly
- [ ] Check context state preservation
- [ ] Monitor performance improvements
- [ ] Remove debug hooks from production
- [ ] Update team documentation

---

## Common Patterns by Module Type

### Simple Module (Basic Routes)

```typescript
export const Routes: FC = () => {
  const stableRoutes = useStableRoutes(routeConfig);

  return (
    <QueryClientProvider client={queryClient}>
      <MyContextProvider>
        <Routes>
          {stableRoutes.map(route => (
            <Route key={route.path} path={route.path} element={<route.Component />} />
          ))}
        </Routes>
      </MyContextProvider>
    </QueryClientProvider>
  );
};
```

### Complex Module (Nested Routes + Context)

```typescript
const AppInner: FC = () => {
  const stableRoutes = useStableRoutes(routeConfig);

  return (
    <ActivityContextProvider>
      <Routes>
        {stableRoutes.map(route => (
          <Route key={route.path} path={route.path} element={<route.Component />} />
        ))}
      </Routes>
    </ActivityContextProvider>
  );
};

export const Routes: FC = () => (
  <QueryClientProvider client={queryClient}>
    <AppInner />
  </QueryClientProvider>
);
```

### Shell-Nested Module (Multiple Route Levels)

```typescript
export const Routes: FC = () => (
  <QueryClientProvider client={queryClient}>
    <Routes>
      <Route path="/*" element={<AppShell />} />
    </Routes>
  </QueryClientProvider>
);

const AppShell: FC = () => {
  const stableRoutes = useStableRoutes(routeConfig);

  return (
    <ActivityContextProvider>
      <Routes>
        {stableRoutes.map(route => (
          <Route key={route.path} path={route.path} element={<route.Component />} />
        ))}
      </Routes>
    </ActivityContextProvider>
  );
};
```

---

## Testing Your Fixes

### Browser Console Debugging

Add this to your browser console to monitor route changes:

```javascript
// Enable route debugging
window.CapitalRxRouteDebugger.diagnoseUnmountIssues({
  hasActivityContext: true,
  hasBlockedNavigation: false,
  hasMultipleQueryClients: false,
  hasUnmemoizedRoutes: false,
});
```

### React DevTools

1. Install React DevTools browser extension
2. Navigate to "Profiler" tab
3. Start recording before navigation
4. Look for unexpected component unmounts/remounts
5. Check "Why did this update?" for unnecessary re-renders

### Network Tab

1. Watch for duplicate API calls during navigation
2. Multiple QueryClient instances will cause redundant requests
3. Proper fix should show single API calls per navigation

### Example Analysis Output

```
CapitalRx Route Analyzer
============================
Analyzing: /path/to/module

  src/PARoutes.tsx
    Issues: 2/1/0

Analysis Complete
Files analyzed: 5
Files with issues: 3
Total issues: 6

HIGH SEVERITY ISSUES:
  src/PARoutes.tsx: Dynamic route generation detected
  src/PARoutes.tsx: Context above Routes detected

RECOMMENDATIONS:
  src/PARoutes.tsx: Wrap routes in useMemo
  src/PARoutes.tsx: Move QueryClient to module level
```

---

## Troubleshooting Guide

### Issue: Routes Still Remounting

**Check:**

1. Route array memoization: `useMemo(() => routes, [deps])`
2. Component keys: Stable keys for each route
3. Shell configuration: Module version compatibility

### Issue: Context State Lost

**Check:**

1. Provider placement: Below shell, above module routes
2. Context value memoization: `useMemo(() => value, [deps])`
3. Multiple providers: Avoid nested providers of same context

### Issue: Performance Still Poor

**Check:**

1. QueryClient instances: Single instance per module
2. Expensive calculations: Memoize with `useMemo`
3. Effect dependencies: Stable dependency arrays

### Issue: Browser Console Errors

**Common errors and solutions:**

- `"No routes matched location"`: Check route path resolution
- `"Cannot read property of undefined"`: Verify context availability
- `"Maximum update depth exceeded"`: Check for circular dependencies

### Common Error Patterns

The error `"No routes matched location"` typically indicates:

- Route path mismatches in nested routing
- Module path resolution conflicts
- Shell-level route configuration issues

Check your route paths match exactly what the shell expects for your module.

---

## Integration Workflows

### For Development Teams

```bash
# Daily route health check
npm run route-analyze

# Detailed investigation
npm run route-analyze-verbose

# Generate team reports
npm run route-analyze-json > route-health-$(date +%Y%m%d).json
```

### For CI/CD Pipelines

```yaml
# Add to GitHub Actions or Jenkins
- name: Route Stability Analysis
  run: npm run route-analyze-json
  continue-on-error: true # Or fail build on issues
```

```bash
npm run route-analyze-json | jq '.summary.totalIssues'  # Get issue count
if [ $(npm run route-analyze-json | jq '.summary.totalIssues') -gt 0 ]; then
  echo "Route issues detected! Check the analysis."
fi
```

### For Code Reviews

```bash
# Quick analysis for PR reviews
npm run route-debug-pa | grep "HIGH SEVERITY" -A 5
```

---

## Team Usage

**Option 1: Copy the toolkit directory**

```bash
cp -r adjudication.capitalrx.com/modules/devtools/ /path/to/your/module/route-toolkit/
cd /path/to/your/module/route-toolkit/
npm run route-analyze-verbose
```

**Option 2: Use directly from devtools module**

```bash
cd adjudication.capitalrx.com/modules/devtools/
npm run route-debug-pa        # Analyze PA module
npm run route-debug-claims    # Analyze Claims module
```

**Option 3: Generate portable reports**

```bash
npm run route-analyze-json > analysis.json
# Share the JSON file with team members
```

### Share Analysis Results

```bash
# Generate shareable report
npm run route-analyze-json > analysis-$(date +%Y%m%d).json

# Quick team analysis
npm run route-debug-pa | tee pa-analysis.txt
```

### Module-Specific Shortcuts

- `npm run route-debug-pa` - Analyze PA module
- `npm run route-debug-claims` - Analyze Claims module

---

## Additional Resources

### Browser Tools

- **React DevTools**: Component tree and state inspection
- **Network Tab**: API call monitoring
- **Performance Tab**: Component render timing
- **Console**: Debug logging and error tracking

### Shell Documentation

- Module registration patterns
- AsyncWrapper behavior
- Path resolution logic
- Context management guidelines

### Best Practices

- Always use stable keys for routes
- Memoize expensive computations
- Place contexts at appropriate levels
- Use debugging hooks during development
- Test navigation thoroughly

### Quick Reference Links

- **Start Here**: Quick start guide (above)
- **Deep Dive**: Complete troubleshooting (above)
- **Implementation**: Step-by-step fixes (above)
- **Examples**: Working code examples (above)

---

## Common Use Cases & Commands

### "My routes are unmounting - help!"

```bash
npm run route-analyze-verbose                    # Find the issues
open src/helpers/route-debugger.html            # Debug in browser
# Check this guide for fixes
```

### "I made changes - did I fix it?"

```bash
npm run route-analyze                           # Before & after comparison
node src/helpers/map-esm-deps.js               # Runtime debugging utilities
```

### "Share analysis with the team"

```bash
npm run route-analyze-json > analysis-$(date +%Y%m%d).json
npm run route-analyze-verbose > analysis.txt
```

### Integrate with our build process"

```bash
npm run route-analyze-json | jq '.summary.totalIssues'  # Get issue count
```

---

## TL;DR - Copy & Paste Commands

```bash
# Get started immediately
cd your-module-directory
npm run route-analyze-verbose

# Fix the most common issue (dynamic routes)
# Add this to your routes file:
# const stableRoutes = useMemo(() => routes.map(...), [routes]);

# Move QueryClient to module level:
# const queryClient = new QueryClient(); // Outside component

# Test your fix:
npm run route-analyze  # Should show fewer/no issues
```

---

## Next Steps

- [ ] Use `npm run route-analyze-verbose` on your modules
- [ ] Follow fixes in this guide
- [ ] Share toolkit directory with your team
- [ ] Integrate JSON output into your CI/CD pipeline

---

**Version:** 2.0
**Last Updated:** August 26, 2025

## debug-routes

### PA Route Fixes

```tsx
// Fixed PA Routes - Implementing stable routing patterns
// This addresses the issues found in the PA module analysis
import { FC, useCallback, useMemo } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Breadcrumb, useModulePathResolver } from "capitalrx-shell";

import { QUEUE_PAGES, STALE_TIME } from "@/constants";
import { ActivityContextProvider } from "@/context";
import { formatCapStrWords, validateUUID } from "@/helpers";
import { useQuestionnaireListQuery } from "@/hooks";
import { useLetterTemplateList } from "@/v2/api";
import { useCasePageQuery, useFeatureFlags } from "@/v2/hooks";

// Import debugging utilities
import { useRouteUnmountDebugger, useStableRoutes } from "../../modules/devtools/src/helpers/map-esm-deps.js";
import { RouteProps, routes as routeConfig } from "./routes";

import styles from "./ReactQueryDevtools.module.scss";
import "./pa_routes.styles.css";

// FIXED: Move QueryClient to module level to prevent recreation
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: STALE_TIME,
    },
  },
});

const casePagePaths = ["case", "case_view"];

// Separate component for route logic to enable proper context placement
const PARoutesInner: FC = () => {
  const useModulePath = useModulePathResolver();
  const modulePath = useModulePath("");
  const { pathname } = useLocation();

  // Add debugging for route changes
  useRouteUnmountDebugger("PARoutesInner");

  const {
    flagValues: [enableQuestionnairesRedesignPage],
  } = useFeatureFlags({ featureFlags: ["enable_questionnaires_redesign_page"] });

  const questionnairePage = enableQuestionnairesRedesignPage ? "questionnaire_view" : "questionnaire";

  // FIXED: Stabilize path calculations to prevent unnecessary re-renders
  const pathInfo = useMemo(() => {
    const currPathList = pathname.split("/");
    const path3 = currPathList[3];
    const path4 = currPathList[4];

    let pathCaseId;
    if (casePagePaths.includes(path3) && !!path4) {
      try {
        pathCaseId = Number(path4);
      } catch (e) {
        console.warn("Failed to parse expected case ID:", path4);
      }
    }

    return { currPathList, path3, path4, pathCaseId };
  }, [pathname]);

  const { currPathList, path3, path4, pathCaseId } = pathInfo;

  const { data: caseData } = useCasePageQuery(pathCaseId);

  const { data: questionnaires } = useQuestionnaireListQuery(
    {
      version_group_uuids: [path4],
    },
    {
      enabled: path3 == questionnairePage && !!validateUUID(path4),
    },
  );

  const questionnaireTitle = questionnaires?.results[0]?.questionnaire.title;

  const { data: letterTemplates } = useLetterTemplateList(
    {
      version_group_uuid: path4,
      latest_versions: true,
      effective_date: "0001-01-01",
      termination_date: "9999-12-31",
    },
    {
      enabled: path3?.startsWith("letter_templates") && !!validateUUID(path4),
    },
  );

  const letterTemplateTitle = letterTemplates?.results[0]?.letter_template.filename;

  // FIXED: Memoize computed values to prevent unnecessary recalculations
  const breadcrumbData = useMemo(() => {
    const queueNameWithoutCase = (() => {
      let localFromList = [...currPathList];
      localFromList = localFromList.slice(3);
      return localFromList.length > 0 ? formatCapStrWords(localFromList.slice(-1)[0]) : null;
    })();

    const pathFourName = path4 && formatCapStrWords(path4);
    const queueOrComplete = !caseData || caseData.is_complete ? "Cases" : caseData.queue_display_name;

    const queueOrCompletePath = (() => {
      if (!caseData || caseData.is_complete) {
        return "/search/case";
      }
      const [pageLabel] = Object.entries(QUEUE_PAGES).find(([, page]) => page.tabs.find((tab) => tab.id === caseData.queue)) || [];
      return pageLabel ? `/queue/${pageLabel}?queue=${caseData.queue}` : "/search/case";
    })();

    return {
      queueNameWithoutCase,
      pathFourName,
      queueOrComplete,
      queueOrCompletePath,
      questionnaireTitle,
      letterTemplateTitle,
    };
  }, [currPathList, path4, caseData, questionnaireTitle, letterTemplateTitle]);

  // FIXED: Stabilize routes to prevent array recreation
  const stableRoutes = useStableRoutes(
    useMemo(
      () =>
        routeConfig.filter(({ path }) => {
          // Filter logic for questionnaire redesign
          if (path.includes("questionnaire_view") && !enableQuestionnairesRedesignPage) {
            return false;
          }
          return true;
        }),
      [enableQuestionnairesRedesignPage],
    ),
  );

  return (
    // FIXED: ActivityContext is now properly placed below the route level
    <ActivityContextProvider>
      <Breadcrumb title="Prior Authorization" path="/">
        {/* All breadcrumb configuration stays the same */}
        <Breadcrumb title={breadcrumbData.queueNameWithoutCase} path={`/queue/${currPathList[4]}`} />
        <Breadcrumb title={breadcrumbData.queueOrComplete} path={breadcrumbData.queueOrCompletePath}>
          <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}`}>
            <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}/appealAcknowledgment`} />
            <Breadcrumb title={"Close Case"} path={`/case/${currPathList[4]}/close`} />
            <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case_view/${currPathList[4]}/createNotification`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title={breadcrumbData.queueOrComplete} path={breadcrumbData.queueOrCompletePath}>
          <Breadcrumb title={`Case ${currPathList[4]}`} path={`/case/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title={"Questionnaires"} path={"/questionnaire"}>
          <Breadcrumb title={"Add Questionnaire"} path={`/${questionnairePage}/upload`} />
          <Breadcrumb title={"Batch Test"} path={`/${questionnairePage}/batch_test`} />
          <Breadcrumb title={`${breadcrumbData.questionnaireTitle || currPathList[5]}`} path={`/${questionnairePage}/${currPathList[4]}`}>
            <Breadcrumb title={`Questionnaire ${currPathList[5]}`} path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}`} />
            <Breadcrumb
              title={`Edit Questionnaire ${currPathList[5]}`}
              path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}/edit`}
            />
            <Breadcrumb title={`New Version`} path={`/${questionnairePage}/${currPathList[4]}/${currPathList[5]}/new`} />
          </Breadcrumb>
        </Breadcrumb>
        {/* ... rest of breadcrumb configuration ... */}
        <Breadcrumb title="Fax Search" path={"/search/fax"}>
          <Breadcrumb title={"View Fax"} path={`/search/fax/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title="Fax Intake" path={"/queue/triage?queue=fax_intake"}>
          <Breadcrumb title="Triage Fax" path={`/fax_triage/${currPathList[4]}/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Failed Communications" path={"/failedCommunications"}>
          <Breadcrumb title={"Re-Send"} path={`/failedCommunications/${currPathList[4]}`} />
        </Breadcrumb>
        <Breadcrumb title={`${breadcrumbData.pathFourName} Cases`} path={`/cases/${currPathList[4]}`} />
        <Breadcrumb title="TAT Batch Test" path={"/turn_around_time/batch_test"} />
        <Breadcrumb title="My Cases & Faxes" path={"/myCasesAndFaxes"} />
        <Breadcrumb title="Letter Templates" path={"/letter_templates"}>
          <Breadcrumb title="Batch Test" path={"/letter_templates/batch_test"} />
          <Breadcrumb title="Create" path={"/letter_templates/create"} />
          <Breadcrumb title={breadcrumbData.letterTemplateTitle || "Letter Template"} path={`/letter_templates/${currPathList[4]}`}>
            <Breadcrumb title="Create Version" path={`/letter_templates/${currPathList[4]}/create`} />
            <Breadcrumb title="Edit Version" path={`/letter_templates/${currPathList[4]}/${currPathList[5]}`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title="Letter Templates" path={"/letter_templates_v2"}>
          <Breadcrumb title="Batch Test" path={"/letter_templates_v2/batch_test"} />
          <Breadcrumb title="Create" path={"/letter_templates_v2/create"} />
          <Breadcrumb title={breadcrumbData.letterTemplateTitle || "Letter Template"} path={`/letter_templates_v2/${currPathList[4]}`}>
            <Breadcrumb title="Create Version" path={`/letter_templates_v2/${currPathList[4]}/create`} />
            <Breadcrumb title="Edit Version" path={`/letter_templates_v2/${currPathList[4]}/${currPathList[5]}`} />
          </Breadcrumb>
        </Breadcrumb>
        <Breadcrumb title="Reports" path={"/reports"}>
          <Breadcrumb title="Report Run" path={`reports/report_run/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Messages" path={"/messages"}>
          <Breadcrumb title="Create Message" path={`/messages/create`} />
          <Breadcrumb title="Edit Message" path={`/messages/edit`} />
        </Breadcrumb>
        <Breadcrumb title="Question Examples" path={"/QuestionComponentExamples"} />
        <Breadcrumb title="User Permissions" path="/users">
          <Breadcrumb title="Edit User Permissions" path={`/users/edit/${currPathList[5]}`} />
        </Breadcrumb>
        <Breadcrumb title="Dashboard" path={"/dashboard"} />
        <Breadcrumb title="Developer Tools" path="/dev">
          <Breadcrumb title="Edit Feature Flags" path="/dev/edit" />
        </Breadcrumb>
      </Breadcrumb>

      <Routes>
        <Route path={"/"} element={<Navigate to={`${modulePath}/search`} />} />
        {stableRoutes.map(({ path, Component }: RouteProps) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>

      {/* Dev tools are hidden by high z-index of sidebar. Push dev tools above sidebar */}
      <div className={styles.ReactQueryDevtools}>
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </ActivityContextProvider>
  );
};

// FIXED: Main export with QueryClientProvider at the proper level
export const PARoutes: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PARoutesInner />
    </QueryClientProvider>
  );
};
```

<details>
  <summary>Fix Route Template</summary>

```tsx
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
```

</details>
