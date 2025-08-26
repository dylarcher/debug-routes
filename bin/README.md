# CapitalRx Route Debugger

**Comprehensive CLI tool for analyzing React Router unmounting issues in CapitalRx shell modules.**

## Overview

This tool combines static code analysis, dependency mapping, and interactive debugging capabilities to help diagnose and fix React Router unmounting problems. It analyzes your codebase and generates either a detailed console report, JSON output, or an interactive HTML report with live debugging tools.

## Features

### Static Analysis
- **Dynamic Route Detection**: Identifies routes that may cause unmounts due to recreation
- **Context Placement Analysis**: Detects problematic context provider placement
- **QueryClient Issues**: Finds multiple QueryClient instances that cause state loss
- **Shell Pattern Analysis**: Checks for CapitalRx shell-specific routing issues
- **Performance Pattern Detection**: Identifies console statements, debugger calls, and inefficient patterns

### Dependency Mapping
- **React Router Analysis**: Detects React Router usage and configuration
- **Shell Component Detection**: Identifies CapitalRx shell components and patterns
- **Query Library Analysis**: Maps TanStack Query usage and potential issues
- **Version Tracking**: Shows detected vs expected dependency versions

### Interactive Debugging (HTML Report)
- **Live Route Monitoring**: Real-time route change tracking
- **Debug Utility Injection**: Adds debugging helpers to any page
- **Route Analysis Tools**: Analyze current route configuration
- **Export Capabilities**: Export debug data for further analysis

## Usage

### Basic Usage
```bash
# Generate interactive HTML report (default)
node routeDebugger.js

# Analyze specific directory
node routeDebugger.js /path/to/your/module

# Generate JSON output
node routeDebugger.js . --json

# Custom output file
node routeDebugger.js . --html --output=my-report.html

# Verbose console output
node routeDebugger.js . --verbose
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--html` | Generate interactive HTML report (default) |
| `--json` | Output results as JSON |
| `-v, --verbose` | Show detailed file-by-file analysis |
| `--output FILE` | Custom output file path |
| `-h, --help` | Show help information |

## Output Formats

### Console Output
Displays a summary of issues organized by severity level with actionable recommendations.

### JSON Output
Structured data including:
- File analysis statistics
- Detailed issue descriptions with fixes
- Dependency mapping
- Route configuration analysis
- Recommendations with priority levels

### HTML Report (Recommended)
Interactive report featuring:
- **Issues Tab**: Visual issue breakdown with severity indicators and fix suggestions
- **Recommendations Tab**: Prioritized action items
- **Dependencies Tab**: Dependency analysis with detection status
- **Debug Tools Tab**: Live debugging utilities that can be used in your application

## Issue Types and Severity

### High Severity
- **Dynamic Route Generation**: Routes recreated on each render causing unmounts
- **Context Placement**: Context providers above Routes causing unnecessary remounts

### Medium Severity
- **QueryClient Creation**: Multiple QueryClient instances causing state loss
- **Blocked Navigation**: Navigation blocking that interferes with routing
- **Activity Context**: Activity tracking that may interfere with navigation
- **Multiple AsyncWrappers**: Conflicting AsyncWrapper usage
- **Unmemoized Shell Hooks**: Shell hooks without proper memoization

### Low Severity
- **Missing Memoization**: Expensive calculations without optimization
- **Performance Issues**: Console statements, debugger calls, inefficient patterns

## Interactive Debug Tools

When you generate an HTML report, you get access to powerful debugging tools:

### Route Monitor
- Tracks all route changes in real-time
- Detects rapid route changes that indicate unmount/remount cycles
- Shows navigation timing and patterns

### Debug Utility Injection
- Adds `useRouteUnmountDebugger` hook to any page
- Provides `CapitalRxRouteDebugger` global utilities
- Enables component lifecycle tracking

### Live Analysis
- Analyze current route configuration
- Export debug data for further analysis
- Monitor route stability issues as they happen

## Common Fixes

### Dynamic Route Generation
```javascript
// Bad: Routes recreated on each render
const routes = routeData.map(({ path, Component }) => (
  <Route key={path} path={path} element={<Component />} />
));

// Good: Memoized routes with stable dependencies
const routes = useMemo(() =>
  routeData.map(({ path, Component }) => (
    <Route key={path} path={path} element={<Component />} />
  )), [routeData.map(r => r.path).join(',')]
);
```

### Context Placement
```javascript
// Bad: Context above Routes
<MyContext.Provider>
  <Routes>
    <Route path="/module/*" element={<ModuleRoutes />} />
  </Routes>
</MyContext.Provider>

// Good: Context below shell routing, above module routes
<Routes>
  <Route path="/module/*" element={
    <MyContext.Provider>
      <ModuleRoutes />
    </MyContext.Provider>
  } />
</Routes>
```

### QueryClient Sharing
```javascript
// Bad: New QueryClient per component
const queryClient = new QueryClient();

// Good: Shared QueryClient instance
const queryClient = useMemo(() => new QueryClient(), []);
// Or better: Use module-level QueryClient
```

## Integration with CI/CD

The tool returns appropriate exit codes for integration with CI/CD pipelines:

```bash
# Returns exit code 1 if issues found
node routeDebugger.js src/ --json > analysis.json
if [ $? -eq 1 ]; then
  echo "Route issues detected!"
  exit 1
fi
```

## File Detection

The tool analyzes files matching these patterns:
- Files containing "route" or "Route" in the name
- Files ending with "Routes.tsx" or "Routes.ts"
- TypeScript (.tsx, .ts) and JavaScript (.jsx, .js) files

Skips these directories: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`

## Dependencies

This tool analyzes and reports on these critical dependencies:
- **react-router / react-router-dom**: Core routing functionality
- **@tanstack/react-query**: Query state management
- **capitalrx-shell**: Shell system components

## Support

For issues or questions about route unmounting problems:

1. Generate an HTML report: `node routeDebugger.js --html`
2. Use the interactive debug tools in your application
3. Review the recommendations and fix suggestions
4. Monitor route changes with the live debugging tools

The HTML report can be loaded directly into your application environment to debug issues in real-time.

## Legacy Tools

This directory also contains the original separate tools that have been combined into `routeDebugger.js`:

- `analyzeRoutes.js` - Original static analyzer (now part of routeDebugger.js)
- `auditRoutes.js` - Original audit utilities (now part of routeDebugger.js)
- `debugRoutes.html` - Original static HTML template (now dynamically generated)
- `PARoutes.fix.tsx` - Example fix implementation for PA module
- `RouteFixModal.tsx` - Generic route fix template

While these tools still work individually, the new `routeDebugger.js` provides all their functionality in a single, more powerful package.
