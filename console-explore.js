// ============================================
// CCHN CRAWL — Chạy trong Console của browser
// ============================================
// Paste toàn bộ script này vào Console tab (DevTools)
// trên trang https://vn-securities-platform.vercel.app/
// Script sẽ intercept Firebase calls và khám phá cấu trúc site

(async function() {
  console.log('🔍 Bắt đầu khám phá...');
  
  // 1. Intercept Firestore calls
  const originalFetch = window.fetch;
  const intercepted = [];
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && (url.includes('firestore') || url.includes('firebase') || url.includes('/api/'))) {
      intercepted.push({ url, method: args[1]?.method || 'GET' });
    }
    return originalFetch.apply(this, args);
  };

  // 2. Navigate to study page and collect data
  const results = { subjects: [], apiCalls: [], links: [] };
  
  // Fetch study page HTML
  const studyRes = await fetch('/study');
  const studyHtml = await studyRes.text();
  
  // Fetch each subject page
  for (let i = 1; i <= 8; i++) {
    try {
      const res = await fetch(`/study/cccm${i}`);
      if (res.ok) {
        results.subjects.push(`cccm${i}`);
      }
    } catch(e) {}
  }
  
  // Wait a bit for any background Firestore calls
  await new Promise(r => setTimeout(r, 2000));
  
  results.apiCalls = intercepted;
  
  // 3. Try to access Firestore directly from the Firebase SDK loaded on page
  try {
    // Find Firebase app instance
    const apps = window._apps || [];
    console.log('Firebase apps:', apps);
  } catch(e) {}

  // 4. Check for any global data stores (Zustand, etc.)
  const globalKeys = Object.keys(window).filter(k => 
    k.includes('store') || k.includes('firebase') || k.includes('__') || k.includes('app')
  );
  results.globalKeys = globalKeys;
  
  console.log('📊 Kết quả:');
  console.log('Subjects found:', results.subjects);
  console.log('API calls intercepted:', results.apiCalls);
  console.log('Interesting global keys:', results.globalKeys);
  console.log(JSON.stringify(results, null, 2));
  
  // Restore original fetch
  window.fetch = originalFetch;
})();
