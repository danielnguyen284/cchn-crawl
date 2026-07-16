// Download all PDFs and explore exam question data
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SITE_URL = 'https://vn-securities-platform.vercel.app';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';

// ============================================
// ALL PDF DOCUMENTS (extracted from source code)
// ============================================
const SUBJECTS = [
  {
    id: 'cccm1', code: 'CCCM 1', name: 'Cơ sở về Chứng khoán',
    docs: [
      { id: 'coso-500cauhoi', title: '500 Câu hỏi – Cơ bản về CK & TTCK', type: 'Ngân hàng câu hỏi', url: '/documents/CoSo-500CauHoi.pdf' },
      { id: 'coso-deweb', title: 'Đề Web – Nhóm 1 & 2', type: 'Đề thi mẫu', url: '/documents/CoSo-DeWeb.pdf' },
    ]
  },
  {
    id: 'cccm2', code: 'CCCM 2', name: 'Pháp luật Chứng khoán',
    docs: [
      { id: 'luat-bode', title: 'Bộ đề Luật – Cập nhật', type: 'Đề thi mẫu', url: '/documents/Luat-BoDe.pdf' },
      { id: 'luat-tonghopchuY', title: 'Tổng hợp Chú ý – Pháp luật CK', type: 'Tài liệu ôn thi', url: '/documents/Luat-TongHopChuY.pdf' },
      { id: 'luat-dethi', title: 'Đề thi Mới Cập Nhật', type: 'Đề thi mẫu', url: '/documents/Luat-DeThi.pdf' },
    ]
  },
  {
    id: 'cccm3', code: 'CCCM 3', name: 'Môi giới Chứng khoán',
    docs: [
      { id: 'moigioi-vietstock', title: 'Tài liệu Môi giới – VietStock', type: 'Tài liệu ôn thi', url: '/documents/MoiGioi-VietStock.pdf' },
      { id: 'moigioi-nganhang', title: '91 câu hỏi Môi giới có đáp án', type: 'Ngân hàng câu hỏi', url: '/documents/MoiGioi-NganHangCauHoi.pdf' },
    ]
  },
  {
    id: 'cccm4', code: 'CCCM 4', name: 'Phân tích & Đầu tư CK',
    docs: [
      { id: 'phantich-bangcongthuc', title: 'Bảng công thức Phân tích', type: 'Công thức', url: '/documents/PhanTich-BangCongThuc.pdf' },
      { id: 'phantich-bangcongthuc2', title: 'Bảng công thức PT & ĐTCK', type: 'Công thức', url: '/documents/PhanTich-BangCongThuc2.pdf' },
      { id: 'phantich-tailieu', title: 'Tài liệu ôn tập Phân tích', type: 'Tài liệu ôn thi', url: '/documents/PhanTich-TaiLieuOnTap.pdf' },
      { id: 'phantich-dapan', title: 'Đáp án Đề thi Phân tích', type: 'Đáp án', url: '/documents/PhanTich-DapAnDeThi.pdf' },
      { id: 'phantich-dechuanTN', title: 'Đề chuẩn Trắc nghiệm PT', type: 'Đề thi mẫu', url: '/documents/PhanTich-DeChuanTN.pdf' },
    ]
  }
];

async function refreshToken() {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  const data = await res.json();
  return data.id_token;
}

async function downloadPDFs() {
  console.log('📥 Tải tài liệu PDF...\n');
  mkdirSync('documents', { recursive: true });
  
  let downloaded = 0;
  let failed = 0;
  
  for (const subject of SUBJECTS) {
    console.log(`\n📂 ${subject.code}: ${subject.name}`);
    
    for (const doc of subject.docs) {
      const filename = doc.url.split('/').pop();
      const filepath = join('documents', filename);
      
      if (existsSync(filepath)) {
        console.log(`  ⏭️  ${filename} (đã có)`);
        continue;
      }
      
      try {
        const res = await fetch(`${SITE_URL}${doc.url}`);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          writeFileSync(filepath, buffer);
          const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
          console.log(`  ✅ ${filename} (${sizeMB} MB) — ${doc.title}`);
          downloaded++;
        } else {
          console.log(`  ❌ ${filename} — HTTP ${res.status}`);
          failed++;
        }
      } catch (e) {
        console.log(`  ❌ ${filename} — ${e.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n📊 Kết quả: ${downloaded} tải thành công, ${failed} thất bại`);
}

async function downloadExamQuestions(token) {
  console.log('\n\n📝 Tải ngân hàng câu hỏi thi từ Firestore...\n');
  mkdirSync('exam-questions', { recursive: true });

  const FIREBASE_PROJECT = 'educated-brokers';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

  // Try reading questions from various possible paths
  // From source code, question IDs follow pattern: cccm1-qh-52, cccm1-qe-31, cccm1-qm-143
  // This suggests questions might be subcollections or in a flat collection

  const subjectIds = ['cccm1', 'cccm2', 'cccm3', 'cccm4', 'cccm5', 'cccm6'];
  
  for (const subjectId of subjectIds) {
    console.log(`\n  🔍 Thử đọc câu hỏi: ${subjectId}...`);

    // Try various paths
    const paths = [
      `${subjectId}`,  // top-level collection named cccm1
      `questions/${subjectId}/items`,
      `subjects/${subjectId}/questions`,
      `examBanks/${subjectId}/questions`,
      `questionBanks/${subjectId}`,
    ];

    for (const path of paths) {
      try {
        const res = await fetch(`${baseUrl}/${path}?pageSize=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.documents && data.documents.length > 0) {
          console.log(`    ✅ FOUND at "${path}" — ${data.documents.length} docs`);
          const fields = Object.keys(data.documents[0].fields || {});
          console.log(`       Fields: ${fields.join(', ')}`);
          
          // Now download ALL documents from this path
          let allDocs = [];
          let nextPageToken = null;
          
          do {
            const pageUrl = `${baseUrl}/${path}?pageSize=300${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
            const pageRes = await fetch(pageUrl, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const pageData = await pageRes.json();
            if (pageRes.ok && pageData.documents) {
              allDocs = allDocs.concat(pageData.documents);
              nextPageToken = pageData.nextPageToken;
            } else {
              break;
            }
          } while (nextPageToken);
          
          console.log(`       📦 Total: ${allDocs.length} câu hỏi`);
          
          // Convert Firestore format to clean JSON
          const cleanDocs = allDocs.map(doc => {
            const clean = { _id: doc.name.split('/').pop() };
            for (const [key, val] of Object.entries(doc.fields || {})) {
              clean[key] = parseFirestoreValue(val);
            }
            return clean;
          });
          
          writeFileSync(
            join('exam-questions', `${subjectId}.json`),
            JSON.stringify(cleanDocs, null, 2)
          );
          console.log(`       💾 Saved to exam-questions/${subjectId}.json`);
          break; // Found, move to next subject
        }
      } catch (e) {
        // skip
      }
    }
  }

  // Also try to read settings/configs collection
  console.log('\n  🔍 Thử đọc settings...');
  try {
    const res = await fetch(`${baseUrl}/settings?pageSize=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.documents) {
      console.log(`    ✅ settings: ${data.documents.length} docs`);
      const cleanDocs = data.documents.map(doc => {
        const clean = { _id: doc.name.split('/').pop() };
        for (const [key, val] of Object.entries(doc.fields || {})) {
          clean[key] = parseFirestoreValue(val);
        }
        return clean;
      });
      writeFileSync('exam-questions/settings.json', JSON.stringify(cleanDocs, null, 2));
    }
  } catch(e) {}

  // Try documents collection
  console.log('  🔍 Thử đọc documents collection...');
  try {
    const res = await fetch(`${baseUrl}/documents?pageSize=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.documents) {
      console.log(`    ✅ documents: ${data.documents.length} docs`);
      writeFileSync('exam-questions/documents-collection.json', JSON.stringify(data.documents, null, 2));
    }
  } catch(e) {}
}

// Helper: Convert Firestore value format to plain JSON
function parseFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return val;
}

async function main() {
  console.log('🚀 CCHN Crawl — Bắt đầu tải dữ liệu\n');
  
  // 1. Download all PDFs (no auth needed — they're public static files)
  await downloadPDFs();
  
  // 2. Try to download exam questions from Firestore
  const token = await refreshToken();
  await downloadExamQuestions(token);
  
  // 3. Save index
  writeFileSync('index.json', JSON.stringify({
    subjects: SUBJECTS,
    downloadedAt: new Date().toISOString()
  }, null, 2));
  
  console.log('\n\n✨ Hoàn tất! Kiểm tra thư mục:');
  console.log('  📂 documents/ — Tài liệu PDF');
  console.log('  📂 exam-questions/ — Ngân hàng câu hỏi JSON');
  console.log('  📄 index.json — Danh sách tổng hợp');
}

main().catch(console.error);
