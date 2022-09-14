import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { API, testExecutor } from './index';
import { CommandLineOptions } from 'command-line-args';
const now = performance.now;

export class TestResult {
    public failed = 0;
    private passed = 0;
    private fails: [any, any][] = [];
    public time = 0;

    public register(res: any, test = { batteryName: 'unknown' }): void {
        if (res === true) {
            this.passed++;
        } else if (res instanceof TestResult) {
            this.failed += res.failed;
            this.passed += res.passed;
            this.fails = [...this.fails, ...res.fails];
        } else {
            this.fails.push([res, test]);
            this.failed++;
        }
    }

    public str(): string {
        return `
            ---   TEST REPORT   ---
                ${chalk[this.failed < 1 ? 'green' : 'red'](this.failed)} tests failed
                ${chalk.green(this.passed.toString())} tests passed
                
            In ${chalk.cyan(this.time.toFixed(0))}ms
            
            ${this.failed === 0 ? chalk.green('All tests passed!') : ''}
            
            ${this.fails.map(
                ([res, test], i) => `\n\n #${i} ${chalk.red(test.batteryName)}: ${res}`
            )}
        `;
    }
}

export default class Test {
    private readonly test;
    private readonly id;
    public readonly batteryName;

    public constructor(test: testExecutor, id: string | number = 'test', batteryName = '') {
        this.id = id;
        this.test = test;
        this.batteryName = batteryName;
    }

    public run(api: API, code: CommandLineOptions): Promise<string | boolean | Error> {
        return this.test(api, code);
    }

    public static currentId = 0;

    public static tests: Test[] = [];

    public static test(name: string, test: testExecutor): void {
        Test.tests.push(new Test(test, Test.tests.length, name));
    }

    /**
     * @returns {TestResult}
     */
    public static async testAll(api: API, flags: CommandLineOptions): Promise<TestResult> {
        let time = now();

        const res = new TestResult();

        for (let test of Test.tests) {
            let testRes;
            try {
                testRes = await test.run(api, flags);
            } catch (e) {
                testRes = e;
            }
            res.register(testRes, test);
        }

        res.time = Math.round(now() - time);

        return res;
    }

    public static eq(o1: Record<string, any>, o2: Record<string, any>): boolean {
        const keys1 = Object.keys(o1);
        const keys2 = Object.keys(o2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (const key of keys1) {
            const val1 = o1[key];
            const val2 = o2[key];
            const areObjects = Test.isOb(val1) && Test.isOb(val2);
            if ((areObjects && !Test.eq(val1, val2)) || (!areObjects && val1 !== val2)) {
                return false;
            }
        }
        return true;
    }

    public static isOb(o: any): boolean {
        return o != null && typeof o === 'object';
    }
}
