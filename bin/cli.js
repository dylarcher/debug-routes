#!/usr/bin/env node

/**
 * CapitalRx Route Debugger - Comprehensive CLI Tool
 * =================================================
 *
 * Combines analysis, auditing, and HTML report generation for React Router unmounting issues.
 *
 * Usage:
 *   node routeDebugger.js [directory] [options]
 *
 * Options:
 *   --verbose    Show detailed analysis
 *   --json       Output results as JSON
 *   --html       Generate interactive HTML report (default: docs/index.html)
 *   --output     Custom output file path
 *   --help       Show help information
 *
 * Examples:
 *   node routeDebugger.js src/
 *   node routeDebugger.js /path/to/module --verbose
 *   node routeDebugger.js . --html --output=my-report.html
 *   node routeDebugger.js . --json > analysis.json
 */

const fs = require("fs");
const path = require("path");

class RouteDebugger {
  constructor(basePath, options = {}) {
    this.basePath = basePath;
    this.options = options;
    this.issues = [];
    this.recommendations = [];
    this.dependencies = {};
    this.routeConfigs = [];
    this.fileStats = {
      total: 0,
      analyzed: 0,
      withIssues: 0,
    };
  }

  run() {
    if (!this.options.json && !this.options.html) {
      console.log("🔧 CapitalRx Route Debugger");
      console.log("============================");
      console.log(`🎯 Analyzing: ${this.basePath}`);
      console.log("");
    }

    // Run analysis
    this.findRouteFiles(this.basePath);
    this.mapDependencies();
    this.generateRecommendations();

    // Output results
    if (this.options.html) {
      return this.generateHTMLReport();
    } else if (this.options.json) {
      return this.generateJSONReport();
    } else {
      return this.printConsoleResults();
    }
  }

  findRouteFiles(dir) {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory() && !this.shouldSkipDirectory(file.name)) {
          this.findRouteFiles(fullPath);
        } else if (this.isRelevantFile(file.name)) {
          this.analyzeRouteFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error reading directory ${dir}:`, error.message);
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ["node_modules", ".git", "dist", "build", "coverage", ".next"];
    return skipDirs.includes(dirName);
  }

  isRelevantFile(fileName) {
    return (
      (fileName.match(/route|Route/i) || fileName.match(/Routes\.tsx?$/)) &&
      fileName.match(/\.(tsx?|jsx?)$/)
    );
  }

  analyzeRouteFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(this.basePath, filePath);

      this.fileStats.analyzed++;

      if (this.options.verbose && !this.options.json && !this.options.html) {
        console.log(`  📄 ${relativePath}`);
      }

      const fileIssues = [];
      const routeConfig = this.extractRouteConfig(content, relativePath);

      // Check for problematic patterns
      this.checkDynamicRouteGeneration(content, relativePath, fileIssues);
      this.checkQueryClientCreation(content, relativePath, fileIssues);
      this.checkContextPlacement(content, relativePath, fileIssues);
      this.checkBlockedNavigation(content, relativePath, fileIssues);
      this.checkActivityContext(content, relativePath, fileIssues);
      this.checkMemoization(content, relativePath, fileIssues);
      this.checkAsyncWrapper(content, relativePath, fileIssues);
      this.checkShellPatterns(content, relativePath, fileIssues);
      this.checkPerformancePatterns(content, relativePath, fileIssues);

      // Add file issues to main issues array
      this.issues.push(...fileIssues);
      this.routeConfigs.push(routeConfig);

      if (fileIssues.length > 0) {
        this.fileStats.withIssues++;
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
  }

  extractRouteConfig(content, filePath) {
    return {
      file: filePath,
      hasActivityContext: content.includes("ActivityContext"),
      hasBlockedNavigation: content.includes("BlockedNavigation"),
      hasMultipleQueryClients: (content.match(/new\s+QueryClient/g) || []).length > 1,
      hasUnmemoizedRoutes: content.includes("routes.map") && !content.includes("useMemo"),
      hasReactRouter: /react-router|useNavigate|useLocation/.test(content),
      hasShellComponents: /Shell|AsyncWrapper|useModulePathResolver/.test(content),
      componentCount: (content.match(/export\s+(default\s+)?function|export\s+(default\s+)?class|const\s+\w+\s*=\s*\(/g) || []).length,
      imports: this.extractImports(content),
    };
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  checkDynamicRouteGeneration(content, filePath, fileIssues) {
    const routesMapPattern = /routes\.map\s*\(\s*\(\s*{\s*path\s*,\s*Component\s*}\s*\)/g;
    const matches = content.match(routesMapPattern);

    if (matches) {
      fileIssues.push({
        type: "dynamic-route-generation",
        severity: "high",
        file: filePath,
        message: "Dynamic route generation detected - may cause unmounts",
        pattern: matches[0],
        fix: "Wrap routes array in useMemo to prevent recreation",
      });
    }
  }

  checkQueryClientCreation(content, filePath, fileIssues) {
    const queryClientPattern = /new\s+QueryClient\s*\(/g;
    const matches = content.match(queryClientPattern);

    if (matches) {
      fileIssues.push({
        type: "query-client-creation",
        severity: "medium",
        file: filePath,
        message: "QueryClient created in route file - may cause state loss",
        count: matches.length,
        fix: "Move QueryClient creation to module level or share instance",
      });
    }
  }

  checkContextPlacement(content, filePath, fileIssues) {
    const contextPattern = /createContext|useContext|\.Provider/g;
    const routesPattern = /<Routes>/g;

    const hasContext = contextPattern.test(content);
    const hasRoutes = routesPattern.test(content);

    if (hasContext && hasRoutes) {
      const contextIndex = content.search(contextPattern);
      const routesIndex = content.search(routesPattern);

      if (contextIndex < routesIndex && contextIndex !== -1 && routesIndex !== -1) {
        fileIssues.push({
          type: "context-placement",
          severity: "high",
          file: filePath,
          message: "Context may be placed above Routes - could cause unmounts",
          fix: "Move context provider below shell routing but above module routes",
        });
      }
    }
  }

  checkBlockedNavigation(content, filePath, fileIssues) {
    if (content.includes("BlockedNavigation")) {
      fileIssues.push({
        type: "blocked-navigation",
        severity: "medium",
        file: filePath,
        message: "BlockedNavigation component found - may interfere with routing",
        fix: "Review BlockedNavigation placement and when conditions",
      });
    }
  }

  checkActivityContext(content, filePath, fileIssues) {
    if (content.includes("ActivityContext")) {
      fileIssues.push({
        type: "activity-context",
        severity: "medium",
        file: filePath,
        message: "ActivityContext found - may track navigation changes",
        fix: "Review ActivityContext usage for potential navigation interference",
      });
    }
  }

  checkMemoization(content, filePath, fileIssues) {
    const hasExpensiveCalculations = /\.map\(|\.filter\(|\.reduce\(|\.forEach\(/g.test(content);
    const hasUseMemo = content.includes("useMemo");
    const hasUseCallback = content.includes("useCallback");

    if (hasExpensiveCalculations && !hasUseMemo && !hasUseCallback) {
      fileIssues.push({
        type: "missing-memoization",
        severity: "low",
        file: filePath,
        message: "Expensive calculations detected without memoization",
        fix: "Consider memoizing expensive calculations with useMemo/useCallback",
      });
    }
  }

  checkAsyncWrapper(content, filePath, fileIssues) {
    if (content.includes("AsyncWrapper")) {
      const matches = content.match(/AsyncWrapper/g);
      if (matches && matches.length > 1) {
        fileIssues.push({
          type: "multiple-async-wrappers",
          severity: "medium",
          file: filePath,
          message: "Multiple AsyncWrapper instances detected",
          count: matches.length,
          fix: "Consolidate AsyncWrapper usage to prevent conflicts",
        });
      }
    }
  }

  checkShellPatterns(content, filePath, fileIssues) {
    if (content.includes("useModulePathResolver")) {
      if (!content.includes("useMemo") || !content.includes("useCallback")) {
        fileIssues.push({
          type: "unmemoized-shell-hooks",
          severity: "medium",
          file: filePath,
          message: "Shell hooks used without proper memoization",
          fix: "Wrap shell hooks with useMemo/useCallback for stability",
        });
      }
    }
  }

  checkPerformancePatterns(content, filePath, fileIssues) {
    const patterns = [
      { pattern: /console\.log/g, message: "Console statements found - remove for production", severity: "low" },
      { pattern: /debugger/g, message: "Debugger statements found - remove for production", severity: "low" },
      { pattern: /JSON\.parse\(JSON\.stringify/g, message: "Deep cloning with JSON methods - consider alternatives", severity: "low" },
    ];

    patterns.forEach(({ pattern, message, severity }) => {
      if (pattern.test(content)) {
        fileIssues.push({
          type: "performance-issue",
          severity,
          file: filePath,
          message: message,
          fix: "Optimize performance by addressing this pattern",
        });
      }
    });
  }

  mapDependencies() {
    this.dependencies = {
      "react-router": {
        version: "6.x",
        critical: true,
        shellPatched: true,
        patchedComponents: ["Switch -> ShellSwitch"],
        detected: this.routeConfigs.some(c => c.hasReactRouter),
      },
      "react-router-dom": {
        version: "6.x",
        critical: true,
        components: ["BrowserRouter", "Routes", "Route", "Navigate", "useNavigate", "useLocation"],
        detected: this.routeConfigs.some(c => c.hasReactRouter),
      },
      "@tanstack/react-query": {
        version: "5.x",
        critical: false,
        issue: "Multiple QueryClient instances may cause state loss",
        detected: this.routeConfigs.some(c => c.hasMultipleQueryClients),
      },
      "capitalrx-shell": {
        version: "latest",
        critical: true,
        components: ["Shell", "AsyncWrapper", "useModulePathResolver", "ShellSwitch"],
        detected: this.routeConfigs.some(c => c.hasShellComponents),
      },
    };
  }

  generateRecommendations() {
    // Generate global recommendations based on analysis
    const highIssues = this.issues.filter(i => i.severity === "high");
    const mediumIssues = this.issues.filter(i => i.severity === "medium");

    if (highIssues.length > 0) {
      this.recommendations.push({
        priority: "high",
        message: "Address high-severity issues immediately to prevent route unmounting",
        action: "Review dynamic route generation and context placement patterns",
      });
    }

    if (mediumIssues.length > 3) {
      this.recommendations.push({
        priority: "medium",
        message: "Multiple medium-severity issues detected",
        action: "Consider refactoring route structure for better stability",
      });
    }

    if (this.routeConfigs.length > 10 && this.routeConfigs.filter(c => c.hasUnmemoizedRoutes).length > 5) {
      this.recommendations.push({
        priority: "medium",
        message: "Large number of unmemoized routes detected",
        action: "Implement useMemo wrapping for route arrays across the application",
      });
    }
  }

  getIssuesByType() {
    const byType = {};
    this.issues.forEach((issue) => {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });
    return byType;
  }

  getIssuesBySeverity() {
    const bySeverity = { high: 0, medium: 0, low: 0 };
    this.issues.forEach((issue) => {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    });
    return bySeverity;
  }

  generateJSONReport() {
    const result = {
      summary: {
        filesAnalyzed: this.fileStats.analyzed,
        filesWithIssues: this.fileStats.withIssues,
        totalIssues: this.issues.length,
        issuesByType: this.getIssuesByType(),
        issuesBySeverity: this.getIssuesBySeverity(),
      },
      issues: this.issues,
      recommendations: this.recommendations,
      dependencies: this.dependencies,
      routeConfigs: this.routeConfigs,
      timestamp: new Date().toISOString(),
      basePath: this.basePath,
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  generateHTMLReport() {
    const outputPath = this.options.output || 'docs/index.html';
    const html = this.createHTMLContent();

    // Ensure the docs directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✅ HTML report generated: ${outputPath}`);
    return { outputPath, issues: this.issues, recommendations: this.recommendations };
  }

  createHTMLContent() {
    const summary = {
      filesAnalyzed: this.fileStats.analyzed,
      filesWithIssues: this.fileStats.withIssues,
      totalIssues: this.issues.length,
      issuesByType: this.getIssuesByType(),
      issuesBySeverity: this.getIssuesBySeverity(),
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CapitalRx Route Debugger Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        h1 {
            color: #0071b3;
            border-bottom: 3px solid #0071b3;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: linear-gradient(135deg, #0071b3, #005a8b);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 2em;
        }
        .summary-card p {
            margin: 0;
            opacity: 0.9;
        }
        .issue {
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
            border-left: 5px solid;
        }
        .issue.high {
            background: #ffebee;
            border-left-color: #f44336;
        }
        .issue.medium {
            background: #fff8e1;
            border-left-color: #ff9800;
        }
        .issue.low {
            background: #e8f5e8;
            border-left-color: #4caf50;
        }
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .issue-type {
            background: rgba(0, 0, 0, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-family: monospace;
        }
        .issue-file {
            font-family: monospace;
            color: #666;
            font-size: 0.9em;
        }
        .fix-suggestion {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 10px;
            margin-top: 10px;
            border-radius: 4px;
        }
        .recommendation {
            background: linear-gradient(135deg, #2196f3, #1976d2);
            color: white;
            padding: 15px;
            margin: 15px 0;
            border-radius: 6px;
        }
        .dependencies {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        .dependency {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #28a745;
        }
        .dependency.critical {
            border-left-color: #dc3545;
        }
        .dependency.not-detected {
            border-left-color: #ffc107;
            opacity: 0.7;
        }
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 1em;
            border-bottom: 3px solid transparent;
        }
        .tab.active {
            border-bottom-color: #0071b3;
            color: #0071b3;
            font-weight: 600;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .code {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
        }
        .debug-tools {
            background: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 8px;
        }
        .debug-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        .debug-button:hover {
            background: #2980b9;
        }
        .monitor {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 350px;
            max-height: 200px;
            overflow-y: auto;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 CapitalRx Route Debugger Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Analyzed Path:</strong> <code>${this.basePath}</code></p>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>${summary.filesAnalyzed}</h3>
                <p>Files Analyzed</p>
            </div>
            <div class="summary-card">
                <h3>${summary.totalIssues}</h3>
                <p>Total Issues</p>
            </div>
            <div class="summary-card">
                <h3>${summary.filesWithIssues}</h3>
                <p>Files with Issues</p>
            </div>
            <div class="summary-card">
                <h3>${summary.issuesBySeverity.high}</h3>
                <p>High Severity</p>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="tabs">
            <button class="tab active" onclick="showTab('issues')">🚨 Issues</button>
            <button class="tab" onclick="showTab('recommendations')">💡 Recommendations</button>
            <button class="tab" onclick="showTab('dependencies')">📦 Dependencies</button>
            <button class="tab" onclick="showTab('debug')">🛠 Debug Tools</button>
        </div>

        <div id="issues" class="tab-content active">
            <h2>Issues Found</h2>
            ${this.generateIssuesHTML()}
        </div>

        <div id="recommendations" class="tab-content">
            <h2>Recommendations</h2>
            ${this.generateRecommendationsHTML()}
        </div>

        <div id="dependencies" class="tab-content">
            <h2>Dependency Analysis</h2>
            ${this.generateDependenciesHTML()}
        </div>

        <div id="debug" class="tab-content">
            <h2>Interactive Debug Tools</h2>
            ${this.generateDebugToolsHTML()}
        </div>
    </div>

    <div id="monitor" class="monitor">
        <div id="monitor-content"></div>
    </div>

    <script>
        // Data for client-side debugging
        window.routeDebugData = ${JSON.stringify({
      issues: this.issues,
      recommendations: this.recommendations,
      dependencies: this.dependencies,
      routeConfigs: this.routeConfigs,
      summary
    }, null, 2)};

        ${this.generateJavaScriptCode()}
    </script>
</body>
</html>`;
  }

  generateIssuesHTML() {
    if (this.issues.length === 0) {
      return '<div class="issue low">✅ No issues detected! Your routing looks stable.</div>';
    }

    const severityIcons = { high: '❌', medium: '⚠️', low: 'ℹ️' };

    return this.issues.map(issue => `
      <div class="issue ${issue.severity}">
        <div class="issue-header">
          <span>${severityIcons[issue.severity]} <strong>${issue.message}</strong></span>
          <span class="issue-type">${issue.type}</span>
        </div>
        <div class="issue-file">📄 ${issue.file}</div>
        ${issue.pattern ? `<div class="code">${this.escapeHtml(issue.pattern)}</div>` : ''}
        ${issue.fix ? `<div class="fix-suggestion">💡 <strong>Fix:</strong> ${issue.fix}</div>` : ''}
      </div>
    `).join('');
  }

  generateRecommendationsHTML() {
    if (this.recommendations.length === 0) {
      return '<div class="recommendation">✅ No specific recommendations at this time.</div>';
    }

    return this.recommendations.map(rec => `
      <div class="recommendation">
        💡 <strong>${rec.priority ? `[${rec.priority.toUpperCase()}]` : ''} ${rec.message}</strong>
        ${rec.action ? `<br><em>Action: ${rec.action}</em>` : ''}
        ${rec.file ? `<br><code>${rec.file}</code>` : ''}
      </div>
    `).join('');
  }

  generateDependenciesHTML() {
    return `
      <div class="dependencies">
        ${Object.entries(this.dependencies).map(([name, info]) => `
          <div class="dependency ${info.critical ? 'critical' : ''} ${!info.detected ? 'not-detected' : ''}">
            <h4>${name}</h4>
            <p><strong>Version:</strong> ${info.version}</p>
            <p><strong>Critical:</strong> ${info.critical ? 'Yes' : 'No'}</p>
            <p><strong>Detected:</strong> ${info.detected ? '✅ Yes' : '❌ No'}</p>
            ${info.issue ? `<p><strong>Issue:</strong> ${info.issue}</p>` : ''}
            ${info.components ? `<p><strong>Components:</strong> ${info.components.join(', ')}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  generateDebugToolsHTML() {
    return `
      <div class="debug-tools">
        <h3>🛠 Live Debugging Tools</h3>
        <p>Use these tools to debug routing issues in real-time when this page is loaded in your application.</p>

        <button class="debug-button" onclick="startRouteMonitor()">Start Route Monitor</button>
        <button class="debug-button" onclick="stopRouteMonitor()">Stop Route Monitor</button>
        <button class="debug-button" onclick="injectDebugUtilities()">Inject Debug Utils</button>
        <button class="debug-button" onclick="analyzeCurrentRoute()">Analyze Current Route</button>
        <button class="debug-button" onclick="exportDebugData()">Export Debug Data</button>

        <div id="debug-output" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
      </div>
    `;
  }

  generateJavaScriptCode() {
    return `
      // Tab functionality
      function showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
          tab.classList.remove('active');
        });

        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');
      }

      // Debug utilities
      const debugUtilities = {
        routeChanges: [],
        componentMounts: new Map(),
        startTime: Date.now(),
        monitoring: false,

        startMonitoring() {
          if (this.monitoring) return;

          this.monitoring = true;

          // Override history methods
          const originalPushState = history.pushState;
          const originalReplaceState = history.replaceState;

          history.pushState = (...args) => {
            this.logRouteChange('pushState', args[2] || location.pathname);
            return originalPushState.apply(history, args);
          };

          history.replaceState = (...args) => {
            this.logRouteChange('replaceState', args[2] || location.pathname);
            return originalReplaceState.apply(history, args);
          };

          window.addEventListener('popstate', (e) => {
            this.logRouteChange('popstate', location.pathname);
          });

          this.updateOutput('Route monitoring started');
        },

        stopMonitoring() {
          this.monitoring = false;
          this.updateOutput('Route monitoring stopped');
        },

        logRouteChange(type, path) {
          const change = {
            type,
            path,
            timestamp: Date.now(),
            elapsed: Date.now() - this.startTime,
          };

          this.routeChanges.push(change);
          this.updateMonitor(\`\${type}: \${path} (\${change.elapsed}ms)\`);
          this.updateOutput(\`[\${new Date().toLocaleTimeString()}] \${type}: \${path}\`);

          // Check for issues
          this.checkForIssues(change);
        },

        checkForIssues(change) {
          const recent = this.routeChanges.filter(c => Date.now() - c.timestamp < 1000).length;

          if (recent > 3) {
            this.updateOutput('⚠️ WARNING: Rapid route changes detected - possible unmount/remount cycle');
          }

          if (this.routeChanges.length > 1) {
            const previous = this.routeChanges[this.routeChanges.length - 2];
            if (previous.path === change.path) {
              this.updateOutput('⚠️ WARNING: Navigation to same route - possible route instability');
            }
          }
        },

        updateMonitor(message) {
          const monitor = document.getElementById('monitor-content');
          if (monitor) {
            const line = document.createElement('div');
            line.textContent = new Date().toLocaleTimeString() + ': ' + message;
            monitor.appendChild(line);

            while (monitor.children.length > 10) {
              monitor.removeChild(monitor.firstChild);
            }
            monitor.scrollTop = monitor.scrollHeight;
          }
        },

        updateOutput(message) {
          const output = document.getElementById('debug-output');
          if (output) {
            output.innerHTML = message + '<br>' + output.innerHTML;
          }
        },

        injectUtilities() {
          const script = document.createElement('script');
          script.textContent = \`
            // Route unmount debugger
            window.useRouteUnmountDebugger = function(componentName) {
              const mountTime = Date.now();
              console.log('🔍 Component mounted:', componentName);

              return {
                componentName,
                mountTime,
                getRenderCount: () => 1,
                getLifespan: () => Date.now() - mountTime
              };
            };

            // Route configuration analyzer
            window.CapitalRxRouteDebugger = {
              analyzeRouteConfiguration: function(routes, modules) {
                console.log('🔍 Analyzing routes:', routes);
                return window.routeDebugData || [];
              },
              diagnoseUnmountIssues: function(config) {
                console.log('🔍 Diagnosing unmount issues:', config);
                return { issues: [], recommendations: [], severity: 'low' };
              }
            };

            console.log('✅ CapitalRx debug utilities injected');
          \`;
          document.head.appendChild(script);

          this.updateOutput('✅ Debug utilities injected into page');
        },

        analyzeCurrentRoute() {
          const analysis = {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            routeChanges: this.routeChanges.length,
            moduleDetected: location.pathname.includes('/module/'),
            moduleId: location.pathname.includes('/module/') ? location.pathname.split('/module/')[1]?.split('/')[0] : null,
          };

          this.updateOutput('📄 Current route analysis: ' + JSON.stringify(analysis, null, 2));
          return analysis;
        },

        exportData() {
          const data = {
            timestamp: new Date().toISOString(),
            location: location.href,
            routeChanges: this.routeChanges,
            analysis: this.analyzeCurrentRoute(),
            originalAnalysis: window.routeDebugData,
          };

          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`route-debug-export-\${Date.now()}.json\`;
          a.click();
          URL.revokeObjectURL(url);

          this.updateOutput('📁 Debug data exported');
        }
      };

      // Global functions for buttons
      function startRouteMonitor() {
        document.getElementById('monitor').style.display = 'block';
        debugUtilities.startMonitoring();
      }

      function stopRouteMonitor() {
        document.getElementById('monitor').style.display = 'none';
        debugUtilities.stopMonitoring();
      }

      function injectDebugUtilities() {
        debugUtilities.injectUtilities();
      }

      function analyzeCurrentRoute() {
        debugUtilities.analyzeCurrentRoute();
      }

      function exportDebugData() {
        debugUtilities.exportData();
      }

      // Initialize
      console.log('🔧 CapitalRx Route Debugger Report loaded');
      console.log('Debug data:', window.routeDebugData);
    `;
  }

  escapeHtml(text) {
    const div = { innerHTML: text };
    return div.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  printConsoleResults() {
    console.log(`\n📊 Analysis Complete`);
    console.log(`Files analyzed: ${this.fileStats.analyzed}`);
    console.log(`Files with issues: ${this.fileStats.withIssues}`);
    console.log(`Total issues: ${this.issues.length}`);

    const highIssues = this.issues.filter((i) => i.severity === "high");
    const mediumIssues = this.issues.filter((i) => i.severity === "medium");
    const lowIssues = this.issues.filter((i) => i.severity === "low");

    if (highIssues.length > 0) {
      console.log("\n🚨 HIGH SEVERITY ISSUES:");
      highIssues.forEach((issue) => {
        console.log(`  ❌ ${issue.file}: ${issue.message}`);
      });
    }

    if (mediumIssues.length > 0) {
      console.log("\n⚠️  MEDIUM SEVERITY ISSUES:");
      mediumIssues.forEach((issue) => {
        console.log(`  ⚠️  ${issue.file}: ${issue.message}`);
      });
    }

    if (lowIssues.length > 0) {
      console.log("\n🔍 LOW SEVERITY ISSUES:");
      lowIssues.forEach((issue) => {
        console.log(`  ℹ️  ${issue.file}: ${issue.message}`);
      });
    }

    if (this.recommendations.length > 0) {
      console.log("\n💡 RECOMMENDATIONS:");
      this.recommendations.forEach((rec) => {
        console.log(`  💡 ${rec.message}`);
      });
    }

    if (this.issues.length === 0) {
      console.log("\n✅ No route unmounting issues detected! Your routing looks stable.");
    } else {
      console.log(`\n📈 SUMMARY: Found ${this.issues.length} issues across ${new Set(this.issues.map((i) => i.file)).size} files`);
      console.log("\n📋 NEXT STEPS:");
      console.log("1. Run with --html to generate an interactive report");
      console.log("2. Use the generated HTML file to debug issues in real-time");
      console.log("3. Test route stability with the interactive debug tools");
      console.log("4. Monitor console logs for unmount messages during navigation");
    }

    return {
      issues: this.issues,
      recommendations: this.recommendations,
      stats: this.fileStats,
    };
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  const options = {
    verbose: false,
    json: false,
    html: false,
    output: null,
    help: false,
  };

  let targetPath = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--json" || arg === "-j") {
      options.json = true;
    } else if (arg === "--html") {
      options.html = true;
    } else if (arg.startsWith("--output=")) {
      options.output = arg.split("=")[1];
    } else if (arg === "--output") {
      options.output = args[++i];
    } else if (!arg.startsWith("--") && fs.existsSync(arg)) {
      targetPath = path.resolve(arg);
    }
  }

  // Default to HTML output if no format specified
  if (!options.json && !options.html) {
    options.html = true;
  }

  if (options.help) {
    console.log(`
🔧 CapitalRx Route Debugger
============================

Comprehensive tool for analyzing React Router patterns and generating interactive debug reports.

USAGE:
  node routeDebugger.js [path] [options]

ARGUMENTS:
  path                    Directory to analyze (default: current directory)

OPTIONS:
  -v, --verbose          Show detailed file-by-file analysis
  -j, --json             Output results as JSON
  --html                 Generate interactive HTML report (default: docs/index.html)
  --output FILE          Custom output file path
  -h, --help             Show this help message

EXAMPLES:
  node routeDebugger.js
  node routeDebugger.js /path/to/module --verbose
  node routeDebugger.js . --html --output=my-report.html
  node routeDebugger.js . --json > analysis.json

FEATURES:
  🚨 Issue Detection:     Dynamic routes, context placement, QueryClient issues
  💡 Recommendations:     Actionable fixes for detected problems
  📦 Dependencies:        Analysis of routing-related dependencies
  🛠 Debug Tools:         Interactive debugging utilities in HTML report
  📊 Real-time Monitor:   Live route change monitoring

The HTML report includes interactive debugging tools that can be used
directly in your application to monitor route changes in real-time.
`);
    process.exit(0);
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  try {
    const analyzer = new RouteDebugger(targetPath, options);
    const results = analyzer.run();

    // Exit with error code if issues found (for CI/CD)
    if (!options.json && !options.html && results.issues && results.issues.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Analysis failed:`, error.message);
    process.exit(1);
  }
}

module.exports = RouteDebugger;
