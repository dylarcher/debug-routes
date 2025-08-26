# CapitalRx Route Debug Toolkit - Complete Guide

** PRODUCTION-READY** - Comprehensive toolkit for troubleshooting React Router unmounting issues in the CapitalRx shell system.

---

## Table of Contents

1. [Quick Start](#-quick-start)
2. [Toolkit Structure](#-toolkit-structure)
3. [Available npm Scripts](#-available-npm-scripts)
4. [What This Toolkit Solves](#-what-this-toolkit-solves)
5. [Available Tools](#-available-tools)
6. [Root Cause Analysis](#-root-cause-analysis)
7. [Issues Identified & Fixes Applied](#-issues-identified--fixes-applied)
8. [Step-by-Step Fix Process](#-step-by-step-fix-process)
9. [Debugging Tools](#-debugging-tools)
10. [Migration Checklist](#-migration-checklist)
11. [Common Patterns by Module Type](#-common-patterns-by-module-type)
12. [Testing Your Fixes](#-testing-your-fixes)
13. [Troubleshooting Guide](#-troubleshooting-guide)
14. [Integration Workflows](#-integration-workflows)
15. [Team Usage](#-team-usage)
16. [Additional Resources](#-additional-resources)

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
- Severity categorization (High, Medium⚠, Low)
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

- `PARoutes-Fixed.tsx` - Working PA module implementation
- `RouteFixTemplate.tsx` - Generic fix patterns

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
// ❌ WRONG - Creates new client on each render
const RouteComponent = () => {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>;
}
```

**Solution**: Move to module level

```typescript
// ✅ CORRECT - Single instance at module level
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 300000 },
  },
});
```

#### 3. **Context Placement Above Routes**

**Problem**: Context providers placed above shell routing level

```typescript
// ❌ WRONG - Context lost on shell route changes
<ActivityContextProvider>
  <Shell>
    <Routes>...</Routes>
  </Shell>
</ActivityContextProvider>
```

**Solution**: Move context inside module routing

```typescript
// ✅ CORRECT - Context preserved during navigation
<QueryClientProvider client={queryClient}>
  <Routes>
    <Route path="/*" element={<ActivityContextProvider>...</ActivityContextProvider>} />
  </Routes>
</QueryClientProvider>
```

#### 4. **Dynamic Route Array Recreation**

**Problem**: Route arrays recreated on each render

```typescript
// ❌ WRONG - New array every render
const Component = () => {
  const routes = routeConfig.filter(condition);
  return <Routes>{routes.map(...)}</Routes>;
}
```

**Solution**: Memoize route arrays

```typescript
// ✅ CORRECT - Stable route references
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
// ❌ BEFORE: Inside route component
const PARoutesComponent = () => {
  const queryClient = new QueryClient({ ... });
  // Routes recreate this on each render
}

// ✅ AFTER: Module level
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
// ❌ BEFORE: Above routes
<ActivityContextProvider>
  <Shell>
    <Routes>
      {/* Context lost on route changes */}
    </Routes>
  </Shell>
</ActivityContextProvider>

// ✅ AFTER: Inside route structure
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
// ❌ BEFORE: Array recreated each render
const PARoutesComponent = () => {
  const routes = routeConfig.filter(/* some condition */);
  return (
    <Routes>
      {routes.map(route => <Route key={route.path} ... />)}
    </Routes>
  );
}

// ✅ AFTER: Stabilized with useMemo
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
// ❌ BEFORE: Calculated on each render
const PARoutesComponent = () => {
  const currPathList = pathname.split("/");
  const queueName = formatCapStrWords(currPathList[4]);
  // ... complex calculations
}

// ✅ AFTER: Memoized calculations
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
    queries: {…},
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
  ❌ src/PARoutes.tsx: Dynamic route generation detected
  ❌ src/PARoutes.tsx: Context above Routes detected

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

- [ ]: Use `npm run route-analyze-verbose` on your modules
- [ ]: Follow fixes in this guide
- [ ]: Share toolkit directory with your team
- [ ]: Integrate JSON output into your CI/CD pipeline

---

> **Version:** 2.0  
> **Last Updated:** August 26, 2025  

## debug-routes
