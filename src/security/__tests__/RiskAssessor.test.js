/**
 * Tests for RiskAssessor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RiskAssessor } from '../RiskAssessor';

describe('RiskAssessor', () => {
    let assessor;

    beforeEach(() => {
        assessor = new RiskAssessor();
    });

    describe('Low Risk Commands', () => {
        it('should assess read-only commands as low risk', () => {
            const commands = ['ls -la', 'pwd', 'cat file.txt', 'git status', 'git log'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('low');
            });
        });

        it('should assess version checks as low risk', () => {
            const commands = ['node --version', 'npm -v', 'git --version'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('low');
            });
        });
    });

    describe('Medium Risk Commands', () => {
        it('should assess file operations as medium risk', () => {
            const commands = ['rm file.txt', 'mv file.txt newfile.txt', 'chmod 644 file.txt'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('medium');
            });
        });

        it('should assess package installation as medium risk', () => {
            const commands = ['npm install', 'pip install package', 'yarn install'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('medium');
            });
        });

        it('should assess git force commands as medium risk', () => {
            const result = assessor.assess('git push --force');
            expect(result.level).toBe('medium');
        });
    });

    describe('High Risk Commands', () => {
        it('should assess recursive deletion as high risk', () => {
            const commands = ['rm -rf /path', 'rm -rf *'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('high');
                expect(result.details.length).toBeGreaterThan(0);
            });
        });

        it('should assess sudo commands as high risk', () => {
            const result = assessor.assess('sudo apt-get install package');
            expect(result.level).toBe('high');
        });

        it('should assess system control commands as high risk', () => {
            const commands = ['shutdown now', 'reboot', 'halt'];

            commands.forEach(cmd => {
                const result = assessor.assess(cmd);
                expect(result.level).toBe('high');
            });
        });

        it('should assess fork bombs as high risk', () => {
            const result = assessor.assess(':(){ :|:& };:');
            expect(result.level).toBe('high');
        });

        it('should assess dangerous permissions as high risk', () => {
            const result = assessor.assess('chmod 777 /important/file');
            expect(result.level).toBe('high');
        });
    });

    describe('Risk Scoring', () => {
        it('should return correct risk scores', () => {
            const lowScore = assessor.getRiskScore('ls');
            const mediumScore = assessor.getRiskScore('rm file.txt');
            const highScore = assessor.getRiskScore('sudo rm -rf /');

            expect(lowScore).toBeLessThan(mediumScore);
            expect(mediumScore).toBeLessThan(highScore);
            expect(lowScore).toBe(20);
            expect(mediumScore).toBe(50);
            expect(highScore).toBe(90);
        });
    });

    describe('Safety Check', () => {
        it('should identify safe commands', () => {
            expect(assessor.isSafe('ls')).toBe(true);
            expect(assessor.isSafe('git status')).toBe(true);
            expect(assessor.isSafe('cat file.txt')).toBe(true);
        });

        it('should identify unsafe commands', () => {
            expect(assessor.isSafe('rm -rf /')).toBe(false);
            expect(assessor.isSafe('sudo something')).toBe(false);
            expect(assessor.isSafe('npm install')).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null/undefined commands', () => {
            const result1 = assessor.assess(null);
            const result2 = assessor.assess(undefined);
            const result3 = assessor.assess('');

            expect(result1.level).toBe('high');
            expect(result2.level).toBe('high');
            expect(result3.level).toBe('high');
        });

        it('should handle unknown commands as medium risk', () => {
            const result = assessor.assess('unknown-command-xyz');
            expect(result.level).toBe('medium');
            expect(result.reason).toContain('Unknown command');
        });

        it('should provide detailed explanations', () => {
            const result = assessor.assess('sudo rm -rf /');
            expect(result.details).toBeDefined();
            expect(result.details.length).toBeGreaterThan(0);
            expect(result.reason).toBeDefined();
        });
    });
});
