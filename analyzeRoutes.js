#!/usr/bin/env node

/**
 * CapitalRx React Router Analyzer
 * ================================
 *
 * Automated tool to detect React Router unmounting issues in CapitalRx modules.
 *
 * Usage:
 *   node route-analyzer.js [directory] [options]
 *
 * Options:
 *   --verbose    Show detailed analysis
 *   --json       Output results as JSON
 *   --help       Show help information
 *
 * Examples:
 *   node route-analyzer.js src/
 *   node route-analyzer.js /path/to/module --verbose
 *   node route-analyzer.js . --json > analysis.json
 */

const fs = require("fs");
const path = require("path");

class RouteAnalyzer {
  constructor(basePath, options = {}) {
    this.basePath = basePath;
    this.options = options;
    this.issues = [];
    this.recommendations = [];
    this.fileStats = {
      total: 0,
      analyzed: 0,
      withIssues: 0,
    };
  }

  run() {
    if (!this.options.json) {
      console.log("🔧 CapitalRx Route Analyzer");
      console.log("============================");
      console.log(`🎯 Analyzing: ${this.basePath}`);
      console.log("");
    }

    this.findRouteFiles(this.basePath);

    if (this.options.json) {
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
        timestamp: new Date().toISOString(),
        basePath: this.basePath,
      };
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    // Console output
    this.printResults();
    return {
      issues: this.issues,
      recommendations: this.recommendations,
      stats: this.fileStats,
    };
  }

  findRouteFiles(dir) {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory() && !this.shouldSkipDirectory(file.name)) {
          this.findRouteFiles(fullPath);
        } else if (this.isRelevantFile(file.name)) {
          this.fileStats.total++;
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
    return (fileName.match(/route|Route/i) || fileName.match(/Routes\.tsx?$/)) && fileName.match(/\.(tsx?|jsx?)$/);
  }

  analyzeRouteFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(this.basePath, filePath);

      this.fileStats.analyzed++;

      if (this.options.verbose && !this.options.json) {
        console.log(`  📄 ${relativePath}`);
      }

      const fileIssues = [];

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

      if (fileIssues.length > 0) {
        this.fileStats.withIssues++;

        if (this.options.verbose && !this.options.json) {
          const highCount = fileIssues.filter((i) => i.severity === "high").length;
          const mediumCount = fileIssues.filter((i) => i.severity === "medium").length;
          const lowCount = fileIssues.filter((i) => i.severity === "low").length;

          console.log(`    Issues: ${highCount}🚨 ${mediumCount}⚠️ ${lowCount}ℹ️`);
        }
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
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
      });

      if (!content.includes("useMemo")) {
        this.recommendations.push({
          file: filePath,
          message: "Wrap routes array in useMemo to prevent recreation",
        });
      }
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
      });

      this.recommendations.push({
        file: filePath,
        message: "Move QueryClient creation to module level or share instance",
      });
    }
  }

  checkContextPlacement(content, filePath, fileIssues) {
    const contextPattern = /createContext|useContext|\.Provider/g;
    const routesPattern = /<Routes>/g;

    const hasContext = contextPattern.test(content);
    const hasRoutes = routesPattern.test(content);

    if (hasContext && hasRoutes) {
      // Try to determine if context is above or below Routes
      const contextIndex = content.search(contextPattern);
      const routesIndex = content.search(routesPattern);

      if (contextIndex < routesIndex && contextIndex !== -1 && routesIndex !== -1) {
        fileIssues.push({
          type: "context-placement",
          severity: "high",
          file: filePath,
          message: "Context may be placed above Routes - could cause unmounts",
        });

        this.recommendations.push({
          file: filePath,
          message: "Move context provider below shell routing but above module routes",
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
      });

      this.recommendations.push({
        file: filePath,
        message: "Review BlockedNavigation placement and when conditions",
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
      });

      this.recommendations.push({
        file: filePath,
        message: "Review ActivityContext usage for potential navigation interference",
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
      });

      this.recommendations.push({
        file: filePath,
        message: "Consider memoizing expensive calculations with useMemo/useCallback",
      });
    }
  }

  checkAsyncWrapper(content, filePath, fileIssues) {
    if (content.includes("AsyncWrapper")) {
      // Check for multiple AsyncWrapper instances
      const matches = content.match(/AsyncWrapper/g);
      if (matches && matches.length > 1) {
        fileIssues.push({
          type: "multiple-async-wrappers",
          severity: "medium",
          file: filePath,
          message: "Multiple AsyncWrapper instances detected",
          count: matches.length,
        });
      }
    }
  }

  checkShellPatterns(content, filePath, fileIssues) {
    // Check for shell-specific patterns that might cause issues
    if (content.includes("useModulePathResolver")) {
      if (!content.includes("useMemo") || !content.includes("useCallback")) {
        fileIssues.push({
          type: "unmemoized-shell-hooks",
          severity: "medium",
          file: filePath,
          message: "Shell hooks used without proper memoization",
        });
      }
    }
  }

  checkPerformancePatterns(content, filePath, fileIssues) {
    // Check for potential performance issues
    const patterns = [
      { pattern: /console\.log/g, message: "Console statements found - remove for production" },
      { pattern: /debugger/g, message: "Debugger statements found - remove for production" },
      { pattern: /JSON\.parse\(JSON\.stringify/g, message: "Deep cloning with JSON methods - consider alternatives" },
    ];

    patterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        fileIssues.push({
          type: "performance-issue",
          severity: "low",
          file: filePath,
          message: message,
        });
      }
    });
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

  printResults() {
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
        console.log(`  💡 ${rec.file}: ${rec.message}`);
      });
    }

    if (this.issues.length === 0) {
      console.log("\n✅ No route unmounting issues detected! Your routing looks stable.");
    } else {
      console.log(`\n📈 SUMMARY: Found ${this.issues.length} issues across ${new Set(this.issues.map((i) => i.file)).size} files`);
      console.log("\n📋 NEXT STEPS:");
      console.log("1. Review the MASTER_GUIDE.md for detailed fix instructions");
      console.log("2. Use the RouteFixTemplate.tsx for implementation examples");
      console.log("3. Test route stability with the route-debugger.html tool");
      console.log("4. Monitor console logs for unmount messages during navigation");
    }
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse CLI arguments
  const options = {
    verbose: false,
    json: false,
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
    } else if (!arg.startsWith("-")) {
      targetPath = path.resolve(arg);
    }
  }

  if (options.help) {
    console.log(`
🔧 CapitalRx Route Analyzer
============================

Analyzes React Router patterns that may cause component unmounting/remounting.

USAGE:
  node route-analyzer.js [path] [options]

ARGUMENTS:
  path                    Directory to analyze (default: current directory)

OPTIONS:
  -v, --verbose          Show detailed file-by-file analysis
  -j, --json             Output results as JSON
  -h, --help             Show this help message

EXAMPLES:
  node route-analyzer.js
  node route-analyzer.js /path/to/module --verbose
  node route-analyzer.js . --json > analysis.json

WHAT IT DETECTS:
  🚨 High Severity:     Dynamic route generation, context above Routes
  ⚠️  Medium Severity:  QueryClient recreation, BlockedNavigation issues  
  ℹ️  Low Severity:     Missing memoization, performance patterns

For detailed fix instructions, see MASTER_GUIDE.md
`);
    process.exit(0);
  }

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  try {
    const analyzer = new RouteAnalyzer(targetPath, options);
    const results = analyzer.run();

    // Exit with error code if issues found (for CI/CD)
    if (!options.json && results.issues && results.issues.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Analysis failed:`, error.message);
    process.exit(1);
  }
}

module.exports = RouteAnalyzer;
