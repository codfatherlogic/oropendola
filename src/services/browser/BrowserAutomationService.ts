import * as puppeteer from 'puppeteer';
import type { Browser, Page, ScreenshotOptions, PDFOptions } from 'puppeteer';

export interface BrowserConfig {
    headless?: boolean;
    width?: number;
    height?: number;
    userAgent?: string;
    timeout?: number;
}

export interface NavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
}

export interface SelectorOptions {
    timeout?: number;
    visible?: boolean;
}

export interface ScrapedData {
    url: string;
    title: string;
    timestamp: number;
    data: any;
}

export interface FormField {
    selector: string;
    value: string;
    type?: 'text' | 'select' | 'checkbox' | 'radio';
}

export interface BrowserSession {
    id: string;
    browser: Browser;
    pages: Map<string, Page>;
    createdAt: number;
    lastActivity: number;
}

export class BrowserAutomationService {
    private static instance: BrowserAutomationService;
    private sessions: Map<string, BrowserSession>;
    private defaultConfig: BrowserConfig;

    private constructor() {
        this.sessions = new Map();
        this.defaultConfig = {
            headless: true,
            width: 1920,
            height: 1080,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            timeout: 30000
        };
    }

    public static getInstance(): BrowserAutomationService {
        if (!BrowserAutomationService.instance) {
            BrowserAutomationService.instance = new BrowserAutomationService();
        }
        return BrowserAutomationService.instance;
    }

    public async createSession(config?: BrowserConfig): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mergedConfig = { ...this.defaultConfig, ...config };

        const browser = await puppeteer.launch({
            headless: mergedConfig.headless,
            args: [
                `--window-size=${mergedConfig.width},${mergedConfig.height}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const session: BrowserSession = {
            id: sessionId,
            browser,
            pages: new Map(),
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        this.sessions.set(sessionId, session);
        return sessionId;
    }

    public async closeSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.browser.close();
            this.sessions.delete(sessionId);
        }
    }

    public async newPage(sessionId: string): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const page = await session.browser.newPage();
        await page.setViewport({
            width: this.defaultConfig.width!,
            height: this.defaultConfig.height!
        });

        const pageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        session.pages.set(pageId, page);
        session.lastActivity = Date.now();

        return pageId;
    }

    public async closePage(sessionId: string, pageId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            const page = session.pages.get(pageId);
            if (page) {
                await page.close();
                session.pages.delete(pageId);
                session.lastActivity = Date.now();
            }
        }
    }

    private getPage(sessionId: string, pageId: string): Page {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const page = session.pages.get(pageId);
        if (!page) {
            throw new Error('Page not found');
        }

        session.lastActivity = Date.now();
        return page;
    }

    // Navigation Methods
    public async navigate(sessionId: string, pageId: string, url: string, options?: NavigationOptions): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.goto(url, {
            waitUntil: options?.waitUntil || 'networkidle2',
            timeout: options?.timeout || this.defaultConfig.timeout
        });
    }

    public async goBack(sessionId: string, pageId: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.goBack();
    }

    public async goForward(sessionId: string, pageId: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.goForward();
    }

    public async reload(sessionId: string, pageId: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.reload();
    }

    // Content Extraction Methods
    public async getPageContent(sessionId: string, pageId: string): Promise<string> {
        const page = this.getPage(sessionId, pageId);
        return await page.content();
    }

    public async getPageTitle(sessionId: string, pageId: string): Promise<string> {
        const page = this.getPage(sessionId, pageId);
        return await page.title();
    }

    public async getPageUrl(sessionId: string, pageId: string): Promise<string> {
        const page = this.getPage(sessionId, pageId);
        return page.url();
    }

    public async extractText(sessionId: string, pageId: string, selector: string): Promise<string> {
        const page = this.getPage(sessionId, pageId);
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        const text = await page.evaluate((el: Element) => el.textContent, element);
        return text || '';
    }

    public async extractAttribute(sessionId: string, pageId: string, selector: string, attribute: string): Promise<string> {
        const page = this.getPage(sessionId, pageId);
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        const value = await page.evaluate(
            (el: Element, attr: string) => el.getAttribute(attr),
            element,
            attribute
        );
        return value || '';
    }

    public async extractAll(sessionId: string, pageId: string, selector: string): Promise<string[]> {
        const page = this.getPage(sessionId, pageId);
        const elements = await page.$$(selector);
        const texts: string[] = [];

        for (const element of elements) {
            const text = await page.evaluate((el: Element) => el.textContent, element);
            if (text) {
                texts.push(text);
            }
        }

        return texts;
    }

    // Interaction Methods
    public async click(sessionId: string, pageId: string, selector: string, options?: SelectorOptions): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.waitForSelector(selector, {
            timeout: options?.timeout || this.defaultConfig.timeout,
            visible: options?.visible !== false
        });
        await page.click(selector);
    }

    public async type(sessionId: string, pageId: string, selector: string, text: string, options?: SelectorOptions): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.waitForSelector(selector, {
            timeout: options?.timeout || this.defaultConfig.timeout,
            visible: options?.visible !== false
        });
        await page.type(selector, text);
    }

    public async select(sessionId: string, pageId: string, selector: string, value: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.select(selector, value);
    }

    public async check(sessionId: string, pageId: string, selector: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        const isChecked = await page.evaluate((el: Element) => (el as HTMLInputElement).checked, element);
        if (!isChecked) {
            await page.click(selector);
        }
    }

    public async uncheck(sessionId: string, pageId: string, selector: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        const isChecked = await page.evaluate((el: Element) => (el as HTMLInputElement).checked, element);
        if (isChecked) {
            await page.click(selector);
        }
    }

    public async fillForm(sessionId: string, pageId: string, fields: FormField[]): Promise<void> {
        const page = this.getPage(sessionId, pageId);

        for (const field of fields) {
            const { selector, value, type = 'text' } = field;

            switch (type) {
                case 'text':
                    await page.type(selector, value);
                    break;
                case 'select':
                    await page.select(selector, value);
                    break;
                case 'checkbox':
                    if (value === 'true') {
                        await this.check(sessionId, pageId, selector);
                    } else {
                        await this.uncheck(sessionId, pageId, selector);
                    }
                    break;
                case 'radio':
                    await page.click(selector);
                    break;
            }
        }
    }

    // Screenshot and PDF Methods
    public async takeScreenshot(
        sessionId: string,
        pageId: string,
        path?: string,
        options?: ScreenshotOptions
    ): Promise<Buffer> {
        const page = this.getPage(sessionId, pageId);
        const screenshot = await page.screenshot({
            path: path as `${string}.png` | `${string}.jpeg` | `${string}.webp` | undefined,
            fullPage: options?.fullPage !== false,
            ...options
        });
        return Buffer.from(screenshot);
    }

    public async screenshotElement(
        sessionId: string,
        pageId: string,
        selector: string,
        path?: string
    ): Promise<Buffer> {
        const page = this.getPage(sessionId, pageId);
        const element = await page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        const screenshot = await element.screenshot({
            path: path as `${string}.png` | `${string}.jpeg` | `${string}.webp` | undefined
        });
        return Buffer.from(screenshot);
    }

    public async generatePDF(
        sessionId: string,
        pageId: string,
        path?: string,
        options?: PDFOptions
    ): Promise<Buffer> {
        const page = this.getPage(sessionId, pageId);
        const pdf = await page.pdf({
            path,
            format: 'A4',
            printBackground: true,
            ...options
        });
        return Buffer.from(pdf);
    }

    // Advanced Scraping Methods
    public async scrapeData(
        sessionId: string,
        pageId: string,
        selectors: Record<string, string>
    ): Promise<ScrapedData> {
        const page = this.getPage(sessionId, pageId);
        const data: any = {};

        for (const [key, selector] of Object.entries(selectors)) {
            try {
                const element = await page.$(selector);
                if (element) {
                    data[key] = await page.evaluate((el: Element) => el.textContent, element);
                }
            } catch (error) {
                data[key] = null;
            }
        }

        return {
            url: page.url(),
            title: await page.title(),
            timestamp: Date.now(),
            data
        };
    }

    public async scrapeTable(sessionId: string, pageId: string, tableSelector: string): Promise<any[][]> {
        const page = this.getPage(sessionId, pageId);

        const tableData = await page.evaluate((selector: string) => {
            const table = document.querySelector(selector) as HTMLTableElement;
            if (!table) return [];

            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => cell.textContent?.trim() || '');
            });
        }, tableSelector);

        return tableData;
    }

    public async scrapeLinks(sessionId: string, pageId: string, linkSelector?: string): Promise<Array<{ text: string; href: string }>> {
        const page = this.getPage(sessionId, pageId);

        const links = await page.evaluate((selector: string) => {
            const anchors = selector
                ? Array.from(document.querySelectorAll(selector) as NodeListOf<HTMLAnchorElement>)
                : Array.from(document.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>);

            return anchors.map(a => ({
                text: a.textContent?.trim() || '',
                href: a.href
            }));
        }, linkSelector || 'a');

        return links;
    }

    // Wait Methods
    public async waitForSelector(
        sessionId: string,
        pageId: string,
        selector: string,
        options?: SelectorOptions
    ): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.waitForSelector(selector, {
            timeout: options?.timeout || this.defaultConfig.timeout,
            visible: options?.visible !== false
        });
    }

    public async waitForNavigation(
        sessionId: string,
        pageId: string,
        options?: NavigationOptions
    ): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.waitForNavigation({
            waitUntil: options?.waitUntil || 'networkidle2',
            timeout: options?.timeout || this.defaultConfig.timeout
        });
    }

    public async waitForTimeout(_sessionId: string, _pageId: string, milliseconds: number): Promise<void> {
        // waitForTimeout is deprecated, use setTimeout with Promise
        await new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    // Evaluation Methods
    public async evaluate(sessionId: string, pageId: string, script: string): Promise<any> {
        const page = this.getPage(sessionId, pageId);
        return await page.evaluate(script);
    }

    public async evaluateFunction(
        sessionId: string,
        pageId: string,
        fn: (...args: any[]) => any,
        ...args: any[]
    ): Promise<any> {
        const page = this.getPage(sessionId, pageId);
        return await page.evaluate(fn, ...args);
    }

    // Cookie Methods
    public async getCookies(sessionId: string, pageId: string): Promise<any[]> {
        const page = this.getPage(sessionId, pageId);
        return await page.cookies();
    }

    public async setCookies(sessionId: string, pageId: string, cookies: any[]): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        await page.setCookie(...cookies);
    }

    public async clearCookies(sessionId: string, pageId: string): Promise<void> {
        const page = this.getPage(sessionId, pageId);
        const cookies = await page.cookies();
        await page.deleteCookie(...cookies);
    }

    // Session Management
    public getActiveSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    public getSessionInfo(sessionId: string): any {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }

        return {
            id: session.id,
            pageCount: session.pages.size,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            pages: Array.from(session.pages.keys())
        };
    }

    public async closeAllSessions(): Promise<void> {
        const sessionIds = Array.from(this.sessions.keys());
        for (const sessionId of sessionIds) {
            await this.closeSession(sessionId);
        }
    }

    // Cleanup inactive sessions
    public async cleanupInactiveSessions(inactivityTimeout: number = 600000): Promise<void> {
        const now = Date.now();
        const sessionIds = Array.from(this.sessions.keys());

        for (const sessionId of sessionIds) {
            const session = this.sessions.get(sessionId);
            if (session && (now - session.lastActivity) > inactivityTimeout) {
                await this.closeSession(sessionId);
            }
        }
    }
}
