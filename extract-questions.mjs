// Extract ALL question data from JS bundles + download real exam questions from API
import { writeFileSync, mkdirSync, readFileSync } from 'fs';

const SITE_URL = 'https://vn-securities-platform.vercel.app';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';

async function refreshToken() {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  return (await res.json()).id_token;
}

async function main() {
  mkdirSync('exam-questions', { recursive: true });

  // =============================================
  // 1. Extract hardcoded seed questions from JS
  // =============================================
  console.log('📝 Extracting seed questions from JS bundles...\n');
  
  // The seed questions are embedded in the source. Extract them.
  const seedQuestions = {
    cccm1: [
      { q: "Công ty Chứng khoán ABC hiện đang trả cổ tức là 2.000 VNĐ/cổ phiếu. Tốc độ tăng trưởng cổ tức dự kiến là 15% trong 3 năm tới, sau đó giảm dần và duy trì ở mức tăng trưởng ổn định là 5% vĩnh viễn. Nếu tỷ suất sinh lời yêu cầu của nhà đầu tư là 12%, giá trị thực của cổ phiếu ABC gần nhất với mức nào sau đây?", options: ["34.500 VNĐ","38.250 VNĐ","41.120 VNĐ","45.000 VNĐ"], correct: "C", exp: "Đây là bài toán định giá theo mô hình chiết khấu cổ tức 2 giai đoạn (Two-stage DDM).", topic: "cccm1-t2" },
      { q: "Một nhà đầu tư mua một trái phiếu doanh nghiệp có đặc tính Callable và Putable. Phát biểu nào sau đây là chính xác nhất?", options: ["Callable làm tăng lợi suất yêu cầu, Putable làm giảm lợi suất yêu cầu","Cả hai đều làm tăng lợi suất","Callable giảm rủi ro tái đầu tư, Putable tăng rủi ro","Lợi suất luôn bằng straight bond"], correct: "A", exp: "Callable mang lợi ích cho tổ chức phát hành, Putable mang lợi ích cho nhà đầu tư.", topic: "cccm1-t2" },
      { q: "Khi công ty mua lại cổ phiếu quỹ, điều nào KHÔNG xảy ra?", options: ["Số lượng CP lưu hành giảm","EPS tăng nếu lợi nhuận không đổi","Tổng VCSH tăng lên","Tỷ lệ sở hữu cổ đông còn lại tăng"], correct: "C", exp: "Mua cổ phiếu quỹ dùng tiền mặt, VCSH giảm chứ không tăng.", topic: "cccm1-t2" },
      { q: "VN-Index tính theo trọng số vốn hóa. Khi một công ty (10% vốn hóa) trả cổ tức bằng CP tỷ lệ 1:1, chỉ số sẽ?", options: ["Giảm 10%","Giảm 5%","Tăng 10%","Không thay đổi"], correct: "D", exp: "Vốn hóa không đổi khi chia tách/trả cổ tức CP.", topic: "cccm1-t4" },
      { q: "Tài sản nào KHÔNG được coi là chứng khoán theo Luật CK 2019?", options: ["HĐTL trái phiếu CP","Chứng chỉ tiền gửi NHTM","Chứng chỉ quỹ mở","Chứng quyền có bảo đảm"], correct: "B", exp: "CCTG là công cụ thị trường tiền tệ, không phải chứng khoán.", topic: "cccm1-t1" },
      { q: "Chứng khoán là gì theo Luật CK 2019?", options: ["CP, TP, CCQ, CQ, CQBĐ, QM CP, CCLK, CCCN và CK phái sinh","Chỉ CP, TP DN, TP CP và CCQ","Giấy tờ có giá do NHNN phát hành","Phương tiện thanh toán thay thế tiền mặt"], correct: "A", exp: "Điều 4 Luật CK 2019.", topic: "cccm1-t1" },
      { q: "Thị trường sơ cấp là?", options: ["TT phát hành CK lần đầu","TT mua đi bán lại CK","TT OTC","TT phái sinh"], correct: "A", exp: "TT sơ cấp = nơi CK được phát hành lần đầu.", topic: "cccm1-t3" },
      { q: "VN-Index phản ánh gì?", options: ["Biến động vốn hóa toàn bộ CP trên HOSE","TB cộng 30 CP thanh khoản nhất","Biến động CP DNNN cổ phần hóa","Hiệu suất quỹ mở và ETF"], correct: "A", exp: "VN-Index phản ánh vốn hóa toàn bộ CP trên HOSE.", topic: "cccm1-t4" },
      { q: "Lệnh ATO có đặc điểm?", options: ["Ưu tiên khớp trước LO tại phiên mở cửa","Mua/bán tại giá đóng cửa hôm trước","Chỉ nhập khi có tin bất thường","Khớp toàn bộ ngay hoặc hủy (FOK)"], correct: "A", exp: "ATO ưu tiên khớp cao nhất tại phiên định kỳ mở cửa.", topic: "cccm1-t5" },
      { q: "HOSE là viết tắt của?", options: ["Sở GDCK TP.HCM","Hội đồng CK","UBCK","Trung tâm Lưu ký"], correct: "A", exp: "Ho Chi Minh Stock Exchange.", topic: "cccm1-t6" },
      { q: "Mệnh giá CP tại VN?", options: ["10.000đ","1.000đ","100.000đ","Không quy định"], correct: "A", exp: "Mệnh giá CP = 10.000đ.", topic: "cccm1-t2" },
      { q: "Trái phiếu zero coupon là?", options: ["TP không trả lãi định kỳ, phát hành chiết khấu","TP trả lãi hàng năm","TP chuyển đổi","TP có bảo đảm"], correct: "A", exp: "Zero-coupon bond phát hành thấp hơn mệnh giá.", topic: "cccm1-t2" },
      { q: "Biên độ dao động giá tối đa tại HOSE?", options: ["±7%","±10%","±5%","±15%"], correct: "A", exp: "HOSE: ±7%.", topic: "cccm1-t5" },
      { q: "Lô giao dịch tối thiểu tại HOSE?", options: ["100 CP","10 CP","1.000 CP","1 CP"], correct: "A", exp: "1 lô = 100 CP.", topic: "cccm1-t5" },
      { q: "T+2 có nghĩa là?", options: ["Thanh toán sau 2 ngày LV","GD trong 2 giờ","Kết quả sau 2 tuần","Hạn mức 2 lần"], correct: "A", exp: "T+2 = thanh toán 2 ngày LV sau ngày GD.", topic: "cccm1-t5" },
    ],
    cccm2: [
      { q: "Luật CK hiện hành có hiệu lực từ năm nào?", options: ["2021","2019","2010","2015"], correct: "A", exp: "Luật CK 2019 (54/2019/QH14) hiệu lực 01/01/2021.", topic: "cccm2-t1" },
      { q: "Vốn điều lệ tối thiểu để niêm yết tại HOSE?", options: ["120 tỷ","30 tỷ","50 tỷ","200 tỷ"], correct: "A", exp: "HOSE yêu cầu VĐL tối thiểu 120 tỷ.", topic: "cccm2-t1" },
      { q: "Công bố TT bất thường phải thực hiện trong?", options: ["24 giờ","3 ngày","7 ngày","1 tháng"], correct: "A", exp: "TT bất thường phải công bố trong 24 giờ.", topic: "cccm2-t1" },
    ],
    cccm5: [
      { q: "ROE là chỉ số nào?", options: ["LN trên VCSH","LN trên tổng TS","Tỷ lệ thanh toán hiện hành","Vòng quay HTK"], correct: "A", exp: "ROE = LN ròng / VCSH.", topic: "cccm5-t4" },
      { q: "BCLCTT bao gồm mấy hoạt động?", options: ["3 (KD, ĐT, TC)","2 (thu, chi)","4","1"], correct: "A", exp: "3 phần: HĐKD, HĐĐT, HĐTC.", topic: "cccm5-t3" },
      { q: "EBITDA là?", options: ["LN trước lãi, thuế, khấu hao","Tổng DT trước thuế","Chi phí vốn vay","LN sau thuế"], correct: "A", exp: "Earnings Before Interest, Taxes, Depreciation and Amortization.", topic: "cccm5-t1" },
    ],
    cccm6: [
      { q: "Bảo lãnh phát hành là?", options: ["Cam kết mua toàn bộ CK chưa bán hết","Tư vấn niêm yết","QLDM","Môi giới CK"], correct: "A", exp: "BLP = cam kết mua CK chưa phân phối hết.", topic: "cccm6-t1" },
      { q: "M&A là?", options: ["Mergers and Acquisitions","Market Analysis","Management Audit","Money and Assets"], correct: "A", exp: "Sáp nhập và Mua lại.", topic: "cccm6-t3" },
    ],
    cccm7: [
      { q: "Quỹ đóng khác quỹ mở ở?", options: ["CCQ cố định, không mua lại","Thanh khoản cao hơn","Không có NAV","Chỉ ĐT CP"], correct: "A", exp: "Quỹ đóng phát hành CCQ cố định.", topic: "cccm7-t1" },
      { q: "NAV là?", options: ["Giá trị TS ròng/CCQ","LN hàng năm","Phí QL quỹ","Số lượng CCQ"], correct: "A", exp: "NAV = (Tổng TS - Tổng nợ) / Số CCQ.", topic: "cccm7-t4" },
      { q: "Chỉ số Sharpe đo?", options: ["LN vượt trội/đơn vị rủi ro","Tổng LN tuyệt đối","Biến động giá","Chi phí QL"], correct: "A", exp: "Sharpe = (Rp - Rf) / σp.", topic: "cccm7-t4" },
    ],
    cccm8: [
      { q: "HĐTL VN30 có nghĩa vụ gì?", options: ["Cả hai bên có nghĩa vụ","Chỉ người mua","Chỉ người bán","Không bắt buộc"], correct: "A", exp: "Futures tạo nghĩa vụ cho cả hai bên.", topic: "cccm8-t1" },
      { q: "Delta trong quyền chọn biểu thị?", options: ["Thay đổi giá QC khi giá TS cơ sở thay đổi 1 đơn vị","Thời gian đáo hạn","Biến động ngụ ý","LS phi rủi ro"], correct: "A", exp: "Delta đo độ nhạy giá QC.", topic: "cccm8-t2" },
      { q: "Hedging với HĐTL là?", options: ["Mở vị thế ngược chiều","Tăng đòn bẩy","Mua và giữ TS","Không hành động"], correct: "A", exp: "Hedging = mở vị thế nghịch chiều.", topic: "cccm8-t4" },
    ],
  };

  // Save seed questions
  let totalSeed = 0;
  for (const [subject, questions] of Object.entries(seedQuestions)) {
    writeFileSync(`exam-questions/${subject}-seed.json`, JSON.stringify(questions, null, 2));
    totalSeed += questions.length;
    console.log(`  ✅ ${subject}: ${questions.length} câu hỏi gốc`);
  }
  console.log(`  📦 Tổng: ${totalSeed} câu hỏi gốc (seed)\n`);

  // =============================================
  // 2. Download REAL exam questions via API
  // =============================================
  console.log('📝 Downloading real exam questions from /api/real-questions...\n');
  
  try {
    const token = await refreshToken();
    const res = await fetch(`${SITE_URL}/api/real-questions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `__session=${token}`,
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      writeFileSync('exam-questions/real-questions-all.json', JSON.stringify(data, null, 2));
      
      let totalReal = 0;
      for (const [subject, questions] of Object.entries(data)) {
        if (Array.isArray(questions) && questions.length > 0) {
          writeFileSync(`exam-questions/${subject}-real.json`, JSON.stringify(questions, null, 2));
          totalReal += questions.length;
          console.log(`  ✅ ${subject}: ${questions.length} câu hỏi thực (đề Sở)`);
        }
      }
      console.log(`  📦 Tổng: ${totalReal} câu hỏi thực\n`);
    } else {
      console.log(`  ❌ API trả về ${res.status}: ${await res.text()}`);
      
      // Try without auth
      console.log('  🔄 Thử không auth...');
      const res2 = await fetch(`${SITE_URL}/api/real-questions`);
      if (res2.ok) {
        const data = await res2.json();
        writeFileSync('exam-questions/real-questions-all.json', JSON.stringify(data, null, 2));
        let totalReal = 0;
        for (const [subject, questions] of Object.entries(data)) {
          if (Array.isArray(questions) && questions.length > 0) {
            writeFileSync(`exam-questions/${subject}-real.json`, JSON.stringify(questions, null, 2));
            totalReal += questions.length;
            console.log(`  ✅ ${subject}: ${questions.length} câu hỏi thực`);
          }
        }
        console.log(`  📦 Tổng: ${totalReal} câu hỏi thực\n`);
      } else {
        console.log(`  ❌ Cũng thất bại: ${res2.status}`);
      }
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  // =============================================
  // 3. Save subjects & topics metadata
  // =============================================
  const subjects = [
    { id: "cccm1", code: "CCCM 1", name: "Cơ bản về Chứng khoán", totalQuestions: 300, topics: [
      { id: "cccm1-t1", name: "Tổng quan về chứng khoán", count: 45 },
      { id: "cccm1-t2", name: "Cổ phiếu và trái phiếu", count: 60 },
      { id: "cccm1-t3", name: "Thị trường sơ cấp và thứ cấp", count: 50 },
      { id: "cccm1-t4", name: "Chỉ số thị trường chứng khoán", count: 40 },
      { id: "cccm1-t5", name: "Cơ chế giao dịch", count: 55 },
      { id: "cccm1-t6", name: "Các tổ chức trên thị trường", count: 50 },
    ]},
    { id: "cccm2", code: "CCCM 2", name: "Pháp luật về Chứng khoán", totalQuestions: 300, topics: [
      { id: "cccm2-t1", name: "Luật Chứng khoán 2019", count: 70 },
      { id: "cccm2-t2", name: "Nghị định và Thông tư hướng dẫn", count: 60 },
      { id: "cccm2-t3", name: "Công bố thông tin", count: 55 },
      { id: "cccm2-t4", name: "Chế tài xử phạt vi phạm", count: 45 },
      { id: "cccm2-t5", name: "UBCKNN", count: 40 },
      { id: "cccm2-t6", name: "Quy tắc đạo đức nghề nghiệp", count: 30 },
    ]},
    { id: "cccm3", code: "CCCM 3", name: "Môi giới và Tư vấn đầu tư", totalQuestions: 300 },
    { id: "cccm4", code: "CCCM 4", name: "Phân tích và Đầu tư CK", totalQuestions: 300 },
    { id: "cccm5", code: "CCCM 5", name: "Phân tích BCTC", totalQuestions: 300 },
    { id: "cccm6", code: "CCCM 6", name: "Tư vấn TC và Bảo lãnh PH", totalQuestions: 300 },
    { id: "cccm7", code: "CCCM 7", name: "Quản lý Quỹ và Tài sản", totalQuestions: 300 },
    { id: "cccm8", code: "CCCM 8", name: "Chứng khoán Phái sinh", totalQuestions: 300 },
  ];
  
  writeFileSync('exam-questions/subjects-metadata.json', JSON.stringify(subjects, null, 2));

  // =============================================
  // 4. Save Google Drive link
  // =============================================
  const externalResources = {
    googleDrive: "https://drive.google.com/drive/folders/1w6eXTf6xRPXxqG0XHuUQLjddigdxHneU",
    description: "Thư mục Google Drive chứa tài liệu bổ sung",
  };
  writeFileSync('exam-questions/external-resources.json', JSON.stringify(externalResources, null, 2));

  console.log('📎 Google Drive: https://drive.google.com/drive/folders/1w6eXTf6xRPXxqG0XHuUQLjddigdxHneU');
  console.log('\n✨ Hoàn tất! Kiểm tra thư mục exam-questions/');
}

main().catch(console.error);
