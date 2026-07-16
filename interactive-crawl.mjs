import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';

const SITE_URL = 'https://vn-securities-platform.vercel.app';
const SUBJECTS = [
  { id: 'cccm1', name: 'Cơ bản về Chứng khoán' },
  { id: 'cccm2', name: 'Pháp luật về Chứng khoán' },
  { id: 'cccm3', name: 'Phân tích và Đầu tư Chứng khoán' },
  { id: 'cccm4', name: 'Môi giới Chứng khoán' },
  { id: 'cccm5', name: 'Phân tích Báo cáo Tài chính' },
  { id: 'cccm6', name: 'Quản lý Danh mục Đầu tư' },
  { id: 'cccm7', name: 'Chứng khoán Phái sinh' },
  { id: 'cccm8', name: 'Tư vấn Tài chính & Bảo lãnh phát hành' }
];

async function main() {
  console.log('🚀 Launching Chrome. Please wait...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Full size
    channel: 'chrome', // Use system Chrome to bypass Google Secure Browser check
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const [page] = await browser.pages();

  // Helper to configure pages to look like a real browser
  const configurePage = async (p) => {
    try {
      await p.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    } catch (e) {
      // ignore
    }
  };

  await configurePage(page);
  
  const openedUrls = new Set();
  const notebookCrawlResults = {};

  // Crawl NotebookLM workspace page content
  async function crawlNotebookLM(newPage, notebookUrl) {
    console.log(`\n🔍 Starting NotebookLM crawl for: ${notebookUrl}`);
    try {
      await newPage.bringToFront();
      console.log('   Waiting 15 seconds for NotebookLM to load and render sources...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const data = await newPage.evaluate(() => {
        const driveLinks = [];
        const docLinks = [];
        const allLinks = [];
        const sourcesText = [];
        
        document.querySelectorAll('a').forEach(a => {
          const href = a.href;
          const text = a.innerText.trim();
          if (!href) return;
          const item = { text, href };
          allLinks.push(item);
          if (href.includes('drive.google.com')) {
            driveLinks.push(item);
          } else if (href.includes('docs.google.com')) {
            docLinks.push(item);
          }
        });
        
        document.querySelectorAll('iframe').forEach(iframe => {
          const src = iframe.src;
          if (!src) return;
          const item = { text: 'Iframe Embed', href: src };
          allLinks.push(item);
          if (src.includes('drive.google.com')) {
            driveLinks.push(item);
          } else if (src.includes('docs.google.com')) {
            docLinks.push(item);
          }
        });

        // Collect candidate source titles/labels
        const sourceSelectors = [
          '[role="button"]',
          'button',
          '.source-card',
          '[class*="source"]',
          '[class*="document"]',
          'h2', 'h3', 'h4'
        ];
        
        sourceSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const txt = el.innerText ? el.innerText.trim() : '';
            if (txt && txt.length > 2 && txt.length < 150 && !sourcesText.includes(txt)) {
              sourcesText.push(txt);
            }
          });
        });
        
        return {
          title: document.title,
          driveLinks,
          docLinks,
          sourcesText,
          allLinks: allLinks.slice(0, 200)
        };
      });
      
      console.log(`   ✅ NotebookLM crawl complete for: "${data.title}"`);
      console.log(`      Found ${data.driveLinks.length} Google Drive links, ${data.docLinks.length} Google Doc links.`);
      return {
        url: notebookUrl,
        title: data.title,
        driveLinks: data.driveLinks,
        docLinks: data.docLinks,
        sourcesText: data.sourcesText,
        allLinks: data.allLinks
      };
    } catch (err) {
      console.error(`   ❌ Failed to crawl NotebookLM page: ${err.message}`);
      return {
        url: notebookUrl,
        error: err.message
      };
    }
  }

  // Set up target listener to detect new page instances/navigation
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      try {
        const newPage = await target.page();
        if (!newPage) return;
        await configurePage(newPage);
        
        // Listen to navigation events in the new tab to detect NotebookLM pages dynamically
        newPage.on('framenavigated', async (frame) => {
          if (frame === newPage.mainFrame()) {
            const url = newPage.url();
            if (url && url !== 'about:blank') {
              if (url.includes('notebooklm.google.com') && !notebookCrawlResults[url]) {
                console.log(`✨ Detected NotebookLM tab: ${url}`);
                openedUrls.add(url);
                notebookCrawlResults[url] = { status: 'crawling' };
                const crawlRes = await crawlNotebookLM(newPage, url);
                notebookCrawlResults[url] = crawlRes;
                try {
                  console.log(`   Closing crawled NotebookLM tab: ${url}`);
                  await newPage.close();
                } catch (e) {}
              } else if (!openedUrls.has(url)) {
                console.log(`✨ Detected opened tab: ${url}`);
                openedUrls.add(url);
                if (url.includes('drive.google.com') || url.toLowerCase().endsWith('.pdf') || url.includes('docs.google.com')) {
                  setTimeout(async () => {
                    try {
                      console.log(`   Closing opened tab to save memory: ${url}`);
                      await newPage.close();
                    } catch (e) {}
                  }, 6000);
                }
              }
            }
          }
        });
      } catch (e) {
        // Ignore
      }
    }
  });

  console.log(`\n👉 Testing direct access to learn dashboard to check login state...`);
  await page.goto(`${SITE_URL}/learn`, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  let loggedIn = false;
  const currentUrl = page.url();
  if (currentUrl.includes('vn-securities-platform.vercel.app') && currentUrl.includes('/learn') && !currentUrl.includes('/login')) {
    console.log('🎉 Direct access successful! User is already logged in.');
    loggedIn = true;
  } else {
    console.log('❌ Direct access redirected or not logged in. Navigating to login page...');
    await page.goto(`${SITE_URL}/login`, { waitUntil: 'networkidle2' });

    console.log('\n======================================================');
    console.log('🔴 IMPORTANT: PLEASE LOG IN MANUALLY IN THE OPENED CHROME WINDOW.');
    console.log('Waiting for you to log in (Google Login, password, etc.)...');
    console.log('======================================================\n');
  }

  let loopCount = 0;
  while (!loggedIn) {
    try {
      const url = page.url();
      if (url.includes('vn-securities-platform.vercel.app') && url.includes('/learn') && !url.includes('/login')) {
        loggedIn = true;
      } else {
        loggedIn = await page.evaluate(async () => {
          const hasLocalStorage = Object.keys(localStorage).some(key => key.startsWith('firebase:authUser:'));
          if (hasLocalStorage && window.location.href.includes('vn-securities-platform.vercel.app')) {
            return true;
          }
          const logoutBtn = Array.from(document.querySelectorAll('button, span, a')).some(el => {
            const txt = el.innerText || '';
            return txt.includes('Đăng xuất') || txt.includes('Logout') || txt.includes('Thoát') || txt.includes('Premium');
          });
          if (logoutBtn && window.location.href.includes('vn-securities-platform.vercel.app')) return true;
          return false;
        });
      }
    } catch (e) {
      // Ignore evaluation errors
    }
    if (!loggedIn) {
      loopCount++;
      if (loopCount % 5 === 0) {
        console.log(`   ⏳ Still waiting for login... Current Page URL: ${page.url()}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('🎉 Login detected successfully! Waiting 5 seconds for session to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (!page.url().includes('/learn')) {
    console.log('👉 Navigating to learn dashboard...');
    await page.goto(`${SITE_URL}/learn`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  mkdirSync('raw', { recursive: true });
  const results = {};

  // Helper function to scan content pane and extract resources
  async function scanAndExtractRightPanel(contextName) {
    console.log(`      Scanning content area...`);
    
    // Extract static links and iframes
    const pageData = await page.evaluate((contextName) => {
      const links = [];
      const driveLinks = [];
      const notebookLinks = [];
      const pdfLinks = [];
      
      document.querySelectorAll('a').forEach(a => {
        const href = a.href;
        const text = a.innerText.trim();
        if (!href || href.startsWith('javascript:')) return;
        
        const item = { text, href, context: contextName };
        links.push(item);
        
        if (href.includes('drive.google.com')) driveLinks.push(item);
        if (href.includes('notebooklm.google.com')) notebookLinks.push(item);
        if (href.toLowerCase().endsWith('.pdf') || href.includes('/documents/')) pdfLinks.push(item);
      });

      document.querySelectorAll('iframe').forEach(iframe => {
        const src = iframe.src;
        if (!src) return;
        const item = { text: 'Iframe Embed', href: src, context: contextName };
        links.push(item);
        if (src.includes('drive.google.com')) driveLinks.push(item);
        if (src.includes('notebooklm.google.com')) notebookLinks.push(item);
      });

      return {
        driveLinks,
        notebookLinks,
        pdfLinks,
        allLinks: links
      };
    }, contextName);

    // Add static links found
    if (pageData.driveLinks.length > 0 || pageData.notebookLinks.length > 0 || pageData.pdfLinks.length > 0) {
      console.log(`      Found static resources: ${pageData.driveLinks.length} Drive, ${pageData.notebookLinks.length} NotebookLM, ${pageData.pdfLinks.length} PDF.`);
    }

    // Look for interactive buttons
    const buttonsToClick = await page.evaluate(() => {
      const clickables = [];
      document.querySelectorAll('button, div[role="button"], a.btn, a, span').forEach((el) => {
        const text = (el.innerText || '').trim();
        if (text.includes('Notebook') || text.includes('Trợ lý') || text.includes('Tài liệu') || text.includes('Drive')) {
          if (text.includes('Giáo trình môn học') || text.length > 100) return;
          clickables.push(text);
        }
      });
      return Array.from(new Set(clickables));
    });

    if (buttonsToClick.length > 0) {
      console.log(`      Found ${buttonsToClick.length} potentially interactive elements: ${JSON.stringify(buttonsToClick)}`);
      for (const btnText of buttonsToClick) {
        console.log(`      👉 Clicking button: "${btnText}"`);
        
        try {
          await page.evaluate((btnText) => {
            const elements = Array.from(document.querySelectorAll('button, div[role="button"], a.btn, a, span'));
            const match = elements.find(el => (el.innerText || '').trim() === btnText);
            if (match) {
              if (match.tagName.toLowerCase() === 'a') {
                match.setAttribute('target', '_blank');
              }
              match.scrollIntoView({ block: 'center' });
              match.click();
            }
          }, btnText);

          // Wait for targetcreated / load
          await new Promise(resolve => setTimeout(resolve, 4000));
        } catch (err) {
          console.log(`      ⚠️ Error clicking button: ${err.message}`);
        }
      }
    }

    return pageData;
  }

  // Traversal of CCCM 1 to 8
  for (let i = 1; i <= 8; i++) {
    const cccmId = `cccm${i}`;
    const cccmText = `CCCM ${i}`;
    console.log(`\n======================================================`);
    console.log(`📘 Processing Subject: ${cccmText}`);
    console.log(`======================================================`);

    // 1. Expand the accordion header for this CCCM
    console.log(`👉 Expanding header card for ${cccmText}...`);
    const clickedSubject = await page.evaluate(async (cccmText) => {
      const elements = Array.from(document.querySelectorAll('div, button, span, a'));
      const match = elements.find(el => {
        const text = (el.innerText || '').trim();
        if (!text.includes(cccmText)) return false;
        if (text.length > 80) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
      if (match) {
        match.scrollIntoView({ block: 'center' });
        match.click();
        return true;
      }
      return false;
    }, cccmText);

    if (clickedSubject) {
      console.log(`   Successfully clicked ${cccmText}. Waiting for panel to expand...`);
      await new Promise(resolve => setTimeout(resolve, 2500));
    } else {
      console.log(`   ⚠️ Could not find accordion header for ${cccmText} on the page.`);
      continue;
    }

    // 2. Extract sub-items under this subject
    const subItems = await page.evaluate((cccmText) => {
      const elements = Array.from(document.querySelectorAll('div, button, span, a'));
      const header = elements.find(el => {
        const text = (el.innerText || '').trim();
        return text.includes(cccmText) && text.length < 80;
      });
      if (!header) return [];

      let container = header;
      let depth = 0;
      while (container.parentElement && depth < 5) {
        container = container.parentElement;
        depth++;
      }

      const clickables = Array.from(container.querySelectorAll('a, div, span, li')).filter(el => {
        const text = (el.innerText || '').trim();
        if (!text || text.includes('CCCM') || text.length > 100) return false;
        
        const isHeader = el.querySelector('h1, h2, h3, h4');
        if (isHeader) return false;

        const hasClickableChild = el.querySelector('a, div, span, li');
        if (hasClickableChild && hasClickableChild.innerText.trim() === text) return false;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });

      const uniqueTexts = [];
      const seen = new Set();
      for (const el of clickables) {
        const txt = el.innerText.trim();
        if (!seen.has(txt)) {
          seen.add(txt);
          uniqueTexts.push(txt);
        }
      }
      return uniqueTexts;
    }, cccmText);

    console.log(`   Found ${subItems.length} topics/sub-items under ${cccmText}:`);
    subItems.forEach((text, index) => {
      console.log(`     [${index}] ${text}`);
    });

    results[cccmId] = {
      subjectName: cccmText,
      topics: {}
    };

    // 3. Loop through sub-items and click them to extract links
    if (subItems.length === 0) {
      console.log(`   ⚠️ No sub-items found. Scanning right panel directly...`);
      const extracted = await scanAndExtractRightPanel(`${cccmText} (Direct)`);
      results[cccmId].topics['default'] = extracted;
    } else {
      for (let subIdx = 0; subIdx < subItems.length; subIdx++) {
        const subText = subItems[subIdx];
        console.log(`\n   👉 Clicking topic [${subIdx + 1}/${subItems.length}]: "${subText}"`);
        
        const clickedSub = await page.evaluate((cccmText, subText) => {
          const elements = Array.from(document.querySelectorAll('div, button, span, a'));
          const header = elements.find(el => {
            const text = (el.innerText || '').trim();
            return text.includes(cccmText) && text.length < 80;
          });
          if (!header) return false;

          let container = header;
          let depth = 0;
          while (container.parentElement && depth < 5) {
            container = container.parentElement;
            depth++;
          }

          const clickables = Array.from(container.querySelectorAll('a, div, span, li'));
          const match = clickables.find(el => el.innerText.trim() === subText);
          if (match) {
            match.scrollIntoView({ block: 'center' });
            match.click();
            return true;
          }
          return false;
        }, cccmText, subText);

        if (clickedSub) {
          console.log('      Waiting 3 seconds for content to load on the right...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          const extracted = await scanAndExtractRightPanel(`${cccmText} - ${subText}`);
          results[cccmId].topics[subText] = extracted;
        } else {
          console.log(`      ⚠️ Failed to click topic: "${subText}"`);
        }
      }
    }
  }

  // Wait a bit to ensure all background NotebookLM crawlers have finished
  console.log('\n⏳ Finalizing: Waiting 10 seconds for any remaining background NotebookLM pages to finish crawling...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  const finalResults = {
    crawledAt: new Date().toISOString(),
    subjects: results,
    notebookCrawlDetails: notebookCrawlResults,
    allCapturedOpenedTabs: Array.from(openedUrls)
  };

  writeFileSync('raw/discovered_notebook_links.json', JSON.stringify(finalResults, null, 2));
  console.log('\n======================================================');
  console.log('🎉 Crawl completed successfully!');
  console.log('Results saved to: raw/discovered_notebook_links.json');
  console.log('======================================================\n');

  await browser.close();
}

main().catch(console.error);
