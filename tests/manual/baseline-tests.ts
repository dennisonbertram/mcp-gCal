/**
 * Baseline Test Suite for mcp-gCal
 * Tests all tools via stdio transport before refactoring
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  testNumber: number;
  name: string;
  method: string;
  params: any;
  response: any;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  error?: string;
}

interface TestSuite {
  testSuite: string;
  timestamp: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

class MCPTester {
  private server: ChildProcess | null = null;
  private testResults: TestResult[] = [];
  private testCount = 0;
  private requestId = 0;

  async start(): Promise<void> {
    console.log('Building mcp-gCal...');
    await this.exec('npm', ['run', 'build']);

    console.log('Starting MCP server...');
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (!this.server || !this.server.pid) {
      throw new Error('Server failed to start');
    }

    console.log(`Server started with PID: ${this.server.pid}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }

  private async exec(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.server || !this.server.stdin || !this.server.stdout) {
      throw new Error('Server not running');
    }

    this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id: this.requestId,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const onData = (data: Buffer) => {
        responseData += data.toString();

        try {
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              if (response.id === this.requestId) {
                clearTimeout(timeout);
                this.server?.stdout?.off('data', onData);
                resolve(response);
                return;
              }
            }
          }
        } catch (e) {
          // Partial JSON, keep accumulating
        }
      };

      this.server?.stdout?.on('data', onData);
      this.server?.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  async runTest(
    name: string,
    method: string,
    params: any
  ): Promise<TestResult> {
    this.testCount++;
    console.log(`\nTest ${this.testCount}: ${name}`);
    console.log(`Method: ${method}`);
    console.log(`Params: ${JSON.stringify(params, null, 2)}`);

    const startTime = Date.now();
    let response: any;
    let status: 'PASS' | 'FAIL' = 'PASS';
    let error: string | undefined;

    try {
      response = await this.sendRequest(method, params);

      if (response.error) {
        status = 'FAIL';
        error = response.error.message || JSON.stringify(response.error);
        console.log(`✗ FAIL: ${error}`);
      } else {
        console.log('✓ PASS');
      }
    } catch (e) {
      status = 'FAIL';
      error = e instanceof Error ? e.message : String(e);
      response = { error };
      console.log(`✗ FAIL: ${error}`);
    }

    const durationMs = Date.now() - startTime;

    const result: TestResult = {
      testNumber: this.testCount,
      name,
      method,
      params,
      response,
      status,
      durationMs,
      error,
    };

    this.testResults.push(result);
    return result;
  }

  async runAllTests(): Promise<TestSuite> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Test 1: Initialize
    await this.runTest('Initialize connection', 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'baseline-test',
        version: '1.0.0',
      },
    });

    // Test 2: List tools
    await this.runTest('List available tools', 'tools/list', {});

    // Test 3: List calendars
    await this.runTest('List calendars', 'tools/call', {
      name: 'list-calendars',
      arguments: {
        showDeleted: false,
        showHidden: false,
      },
    });

    // Test 4: Get primary calendar
    await this.runTest('Get primary calendar', 'tools/call', {
      name: 'get-calendar',
      arguments: {
        calendarId: 'primary',
      },
    });

    // Test 5: List events
    await this.runTest('List events from primary calendar', 'tools/call', {
      name: 'list-events',
      arguments: {
        calendarId: 'primary',
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      },
    });

    // Test 6: Create calendar
    await this.runTest('Create test calendar', 'tools/call', {
      name: 'create-calendar',
      arguments: {
        summary: 'MCP Test Calendar - Baseline',
        description: 'Test calendar created during baseline testing',
        timeZone: 'America/New_York',
      },
    });

    // Test 7: Create event
    await this.runTest('Create event', 'tools/call', {
      name: 'create-event',
      arguments: {
        calendarId: 'primary',
        summary: 'Baseline Test Event',
        description: 'Created during baseline testing',
        start: {
          dateTime: tomorrow.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: tomorrowEnd.toISOString(),
          timeZone: 'America/New_York',
        },
      },
    });

    // Test 8: Query free/busy
    await this.runTest('Query free/busy', 'tools/call', {
      name: 'gcal-freebusy-query',
      arguments: {
        calendarIds: 'primary',
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
      },
    });

    // Test 9: Find available time
    await this.runTest('Find available time', 'tools/call', {
      name: 'gcal-find-available-time',
      arguments: {
        calendarIds: 'primary',
        duration: 60,
        searchRange: 'next week',
        maxSuggestions: 3,
      },
    });

    // Test 10: Quick add event
    await this.runTest('Quick add event', 'tools/call', {
      name: 'gcal-quick-add-event',
      arguments: {
        calendarId: 'primary',
        text: 'Team meeting tomorrow at 3pm for 1 hour',
      },
    });

    // Test 11: List ACL
    await this.runTest('List calendar ACL', 'tools/call', {
      name: 'gcal-list-calendar-acl',
      arguments: {
        calendarId: 'primary',
      },
    });

    // Test 12: Error - Invalid calendar
    await this.runTest('Error: Invalid calendar ID', 'tools/call', {
      name: 'get-calendar',
      arguments: {
        calendarId: 'invalid-calendar-id-12345',
      },
    });

    // Test 13: Error - Missing params
    await this.runTest('Error: Missing required parameters', 'tools/call', {
      name: 'create-event',
      arguments: {
        calendarId: 'primary',
      },
    });

    // Test 14: Error - Invalid event
    await this.runTest('Error: Invalid event ID', 'tools/call', {
      name: 'get-event',
      arguments: {
        calendarId: 'primary',
        eventId: 'invalid-event-id-99999',
      },
    });

    const passed = this.testResults.filter((r) => r.status === 'PASS').length;
    const failed = this.testResults.filter((r) => r.status === 'FAIL').length;

    return {
      testSuite: 'mcp-gCal Baseline Tests',
      timestamp: new Date().toISOString(),
      tests: this.testResults,
      summary: {
        total: this.testCount,
        passed,
        failed,
      },
    };
  }

  async saveResults(filename: string, results: TestSuite): Promise<void> {
    const outputPath = path.join(__dirname, filename);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✓ Results saved to: ${outputPath}`);
  }
}

async function main() {
  const tester = new MCPTester();

  try {
    await tester.start();
    const results = await tester.runAllTests();

    console.log('\n=== Test Summary ===');
    console.log(`Total tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);

    await tester.saveResults('baseline-results.json', results);

    if (results.summary.failed === 0) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n✗ Some tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    await tester.stop();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { MCPTester, TestResult, TestSuite };
