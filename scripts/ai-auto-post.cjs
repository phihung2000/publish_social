#!/usr/bin/env node
/**
 * AI Auto Post for PetX CMS (https://petx.io.vn/)
 * Tự động tạo Content + Ảnh bằng AI và gửi qua Telegram Bot & Buffer.
 *
 * Hỗ trợ 3 tài khoản Gemini Pro:
 *   - Tự động luân phiên (Round-Robin) chia đều tải
 *   - Tự động chuyển đổi dự phòng (Failover) nếu 1 tài khoản hết quota
 *   - Lấy key từ file: gemini-keys.json hoặc .env
 *
 * Thông tin liên hệ:
 *   - Hotline / Zalo: 0396 476 443 | 0336 781 793
 *   - Email: nguyenphihung3800@gmail.com | exteam.solutions@gmail.com
 *   - Website: https://petx.io.vn/
 */

const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns');

// Tự động phân giải DNS IPv4 cho Google API tránh lỗi getaddrinfo ENOTFOUND trên macOS
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map(a => ({ address: a, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    return origLookup(hostname, options, callback);
  });
};

const rootDir = path.resolve(__dirname, '..');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9289182695:AAHmYnvuwqA8XJW1NyNKcsjOVErKEopbEX0';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || 2125360645;
const BUFFER_TOKEN = process.env.BUFFER_TOKEN || 'OuGLfQ2egmnFbTkOiLU46ZUq6eAmtCqHqJtpdCThPXS';
const BUFFER_CHANNEL_ID = process.env.BUFFER_CHANNEL_ID || '6af68b4862b70b94b0143804';

// Nạp các API key của 3 tài khoản Gemini Pro
function loadGeminiKeys() {
  const keys = [];

  // 1. Đọc từ file gemini-keys.json
  const jsonPath = path.join(rootDir, 'gemini-keys.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(data.accounts)) {
        for (const acc of data.accounts) {
          const k = acc.apiKey && typeof acc.apiKey === 'string' ? acc.apiKey.trim() : '';
          if (k.length > 15 && !k.toLowerCase().includes('dien_api_key')) {
            keys.push({ name: acc.name || 'Gemini Account', key: k });
          }
        }
      }
    } catch { }
  }

  // 2. Đọc từ file .env nếu chưa có trong json
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envText = fs.readFileSync(envPath, 'utf8');
      const key1 = envText.match(/^GEMINI_API_KEY_1=(.+)/m)?.[1]?.trim();
      const key2 = envText.match(/^GEMINI_API_KEY_2=(.+)/m)?.[1]?.trim();
      const key3 = envText.match(/^GEMINI_API_KEY_3=(.+)/m)?.[1]?.trim();
      [key1, key2, key3].forEach((k, idx) => {
        if (k && k.length > 15 && !k.toLowerCase().includes('dien_api_key') && !keys.some(item => item.key === k)) {
          keys.push({ name: `Gemini Pro .env #${idx + 1}`, key: k });
        }
      });
    } catch { }
  }

  // 3. Đọc từ process.env
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 15) {
    const k = process.env.GEMINI_API_KEY.trim();
    if (!keys.some(item => item.key === k)) {
      keys.push({ name: 'Gemini Pro Env Single', key: k });
    }
  }

  return keys;
}

const CONTACT_FOOTER = `
👉 Liên hệ tư vấn & cài đặt phần mềm PetX CMS:
📞 Hotline / Zalo: 0396 476 443 | 0336 781 793
📧 Email: nguyenphihung3800@gmail.com | exteam.solutions@gmail.com
🌐 Trải nghiệm trực tiếp tại: https://petx.io.vn/

#PetX #PetXCMS #PhanMemThuY #QuanLyPhongKhamThuY #PetClinic #PetShopPOS #BacSiThuY`;

const TOPICS = {
  treatment: {
    name: 'Khám bệnh mới, Kê toa & Bệnh án điện tử',
    prompt: 'Viết bài quảng cáo tính năng Khám bệnh mới, Kê toa thuốc và Bệnh án điện tử của PetX CMS (petx.io.vn). Nêu nỗi đau bác sĩ thú y ghi chép bệnh án bằng sổ tay dễ thất lạc, khó xem lại lịch sử điều trị cũ. PetX giúp tạo phiếu khám trong 30 giây, kê toa tính tiền tự động và tra cứu 1 giây qua SĐT. Có tính năng khôi phục toa thuốc lỡ tay xóa.',
    sampleCaption: `🩺 BÁC SĨ THÚ Y THỜI 4.0: QUẢN LÝ BỆNH ÁN ĐIỆN TỬ, NÓI KHÔNG VỚI SỔ TAY THẤT LẠC!

Mỗi lần tiếp nhận ca tái khám, bạn lại mất cả chục phút lật từng cuốn sổ tìm xem lần trước cún miu tiêm thuốc gì, liều lượng ra sao?

🐾 Với Module Thông Tin Điều Trị của PetX CMS (https://petx.io.vn/):
✔️ Tạo phiếu khám bệnh cực nhanh: lưu đầy đủ giống loài, tuổi, cân nặng, triệu chứng.
✔️ Kê toa thuốc trực tiếp từ kho dược, tự động tính tổng tiền & in đơn rõ ràng.
✔️ Tra cứu toàn bộ lịch sử các đợt khám trước chỉ với 1 cú click qua SĐT chủ nuôi.
✔️ Đặc biệt: Có tính năng Khôi Phục Toa Thuốc an toàn khi lỡ tay xóa!
✔️ Đồng bộ dữ liệu mượt mà lên ứng dụng di động PetX Mobile cho Bác sĩ theo dõi từ xa.
${CONTACT_FOOTER}`,
    imagePool: [
      'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1080&q=80',
      'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=1080&q=80',
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=1080&q=80',
      'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1080&q=80',
    ],
  },
  pos: {
    name: 'Bán hàng Pet Shop (POS) & In hóa đơn',
    prompt: 'Viết bài quảng cáo tính năng Bán hàng POS và Quản lý bán lẻ phụ kiện, thức ăn thú cưng trên PetX CMS (petx.io.vn). Thao tác nhanh, quét mã vạch, tự động trừ kho, quản lý đơn đổi trả hàng.',
    sampleCaption: `🛒 TĂNG TỐC BÁN HÀNG PET SHOP - THANH TOÁN 1 GIÂY, TRỪ KHO CHÍNH XÁC!

Vừa bán thức ăn, phụ kiện, vừa thanh toán phí khám chữa bệnh khiến quầy thu ngân dễ nhầm lẫn, sót bill?

🚀 Phân hệ Bán Hàng PetShop của PetX CMS (https://petx.io.vn/) giúp bạn:
🏷️ Màn hình POS hiện đại, hỗ trợ máy quét mã vạch bán hàng trong chớp mắt.
🏷️ Quản lý danh sách đơn hàng, tự động tính chiết khấu và in hóa đơn sắc nét.
🏷️ Quản lý trả hàng (Return Order) chuyên nghiệp, cập nhật lại tồn kho ngay lập tức.
🏷️ Tính năng khôi phục đơn bán bị xóa, triệt tiêu nguy cơ gian lận doanh thu!
${CONTACT_FOOTER}`,
    imagePool: [
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1080&q=80',
      'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=1080&q=80',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1080&q=80',
      'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=1080&q=80',
    ],
  },
  inventory: {
    name: 'Nhập thuốc & Kiểm kê kho hàng thực tế',
    prompt: 'Viết bài quảng cáo tính năng Nhập thuốc và Kiểm kê kho hàng thực tế của PetX CMS (petx.io.vn). Nêu nỗi đau lệch kho thuốc thú y, không biết thuốc hao hụt ở đâu. PetX giúp kiểm kê thực tế đối chiếu sổ sách, tự động tính chênh lệch thừa thiếu.',
    sampleCaption: `📦 KIỂM KÊ KHO THUỐC THÚ Y KHÔNG CÒN LÀ CƠN ÁC MỘNG CUỐI THÁNG!

Tồn kho trên sổ một đằng, thuốc trong tủ thực tế một nẻo? Không biết thuốc thất thoát do kê đơn hay hao hụt?

💡 PetX CMS mang đến giải pháp Kiểm Kê Kho Hàng chuẩn xác (https://petx.io.vn/):
📋 Nhập số lượng thực tế tại quầy, hệ thống tự động đối chiếu với số liệu sổ sách.
📋 Báo cáo chênh lệch thừa/thiếu chi tiết theo từng loại thuốc, vắc xin, hàng hóa.
📋 Cân bằng kho tự động chỉ với 1 thao tác, lưu lịch sử kiểm kê minh bạch.
📋 Quản lý nhập thuốc chặt chẽ theo giá vốn và nhà cung cấp.
${CONTACT_FOOTER}`,
    imagePool: [
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=1080&q=80',
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1080&q=80',
      'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1080&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1080&q=80',
    ],
  },
  doctor: {
    name: 'Thống kê doanh số & Hiệu suất theo Bác sĩ thú y',
    prompt: 'Viết bài quảng cáo tính năng Thống kê doanh số điều trị và bán hàng theo từng Bác sĩ thú y trên PetX CMS (petx.io.vn). Nêu lợi ích tính hoa hồng, đánh giá năng lực bác sĩ minh bạch.',
    sampleCaption: `📊 TÍNH HOA HỒNG BÁC SĨ THÚ Y MINH BẠCH - NẮM BẮT DOANH SỐ TỨC THÌ!

Mỗi cuối tháng chủ phòng khám lại đau đầu ngồi cộng tay từng ca khám để tính % hoa hồng cho các bác sĩ thú y?

✨ PetX CMS cung cấp hệ thống 13 báo cáo chuyên sâu (https://petx.io.vn/):
👨‍⚕️ Thống kê số lượng ca khám và doanh thu điều trị chi tiết theo từng Bác sĩ.
📈 Thống kê doanh số bán hàng, dịch vụ theo từng nhân viên phụ trách.
💰 Báo cáo Lời - Lỗ (P&L) rõ ràng, phân tách dòng tiền điều trị và bán lẻ PetShop.
📱 Có sẵn ứng dụng PetX Mobile App cho bác sĩ và chủ phòng khám theo dõi trên điện thoại!
${CONTACT_FOOTER}`,
    imagePool: [
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=1080&q=80',
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1080&q=80',
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1080&q=80',
    ],
  },
  mobile: {
    name: 'Ứng dụng PetX Mobile trên điện thoại',
    prompt: 'Viết bài quảng cáo ứng dụng PetX Mobile App cho iOS và Android. Bác sĩ thú y và chủ phòng khám có thể theo dõi ca khám, doanh thu và tra cứu dữ liệu từ xa ngay trên điện thoại di động.',
    sampleCaption: `📱 THEO DÕI PHÒNG KHÁM THÚ Y TRONG TẦM TAY VỚI PETX MOBILE APP!

Bác sĩ đi công tác, chủ phòng khám không có mặt tại quầy nhưng vẫn muốn nắm trọn tình hình hoạt động?

🚀 Đã có ứng dụng PetX Mobile (đồng bộ dữ liệu 100% với Web CMS):
📲 Tra cứu nhanh bệnh án, đơn thuốc và lịch sử thú cưng ngay trên điện thoại.
📲 Xem báo cáo doanh thu, số ca điều trị trong ngày theo thời gian thực.
📲 Giao diện tối ưu, mượt mà, tiện lợi cho bác sĩ khám lưu động ngoài hiện trường!
${CONTACT_FOOTER}`,
    imagePool: [
      'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1080&q=80',
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1080&q=80',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1080&q=80',
    ],
  },
};

function pickRandomImage(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

  // Gọi Gemini AI với cơ chế luân phiên 3 tài khoản & tự động chuyển tài khoản khi gặp lỗi
  async function generateWithGeminiPool(prompt, keys) {
    const systemInstruction = `Bạn là chuyên gia Content Marketing B2B chuyên về phần mềm quản lý phòng khám thú y PetX CMS (website: https://petx.io.vn/ - Hotline/Zalo: 0396 476 443 | 0336 781 793 - Email: nguyenphihung3800@gmail.com | exteam.solutions@gmail.com).
LƯU Ý QUAN TRỌNG VỀ TÍNH NĂNG THỰC TẾ CỦA PETX CMS:
- PetX CMS chuyên sâu về: Khám bệnh mới, Kê toa thuốc, Bệnh án điện tử, Khôi phục toa thuốc lỡ xóa, Bán hàng Pet Shop POS, Nhập thuốc, Kiểm kê kho hàng (đối chiếu thừa thiếu), Xuất chuyển kho chi nhánh, Báo cáo doanh số theo Bác sĩ thú y, Quản lý công nợ & thu chi, In mã vạch, và có app PetX Mobile.
- KHÔNG viết về Spa & Grooming vì phần mềm không chuyên mảng này.
- Luôn kèm thông tin liên hệ đầy đủ các option.`;

    // Luân phiên ngẫu nhiên (Load-balance) tài khoản bắt đầu
    const startIndex = Math.floor(Math.random() * keys.length);
    const orderedAccounts = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];

    for (const account of orderedAccounts) {
      console.log(`[Gemini Pro] 🤖 Đang dùng ${account.name} để viết nội dung...`);

      for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${account.key}`;
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `${systemInstruction}\n\nYêu cầu đề tài: ${prompt}\n\nQUY TẮC QUAN TRỌNG: Chỉ trả về trực tiếp nội dung bài đăng Facebook hoàn chỉnh, BẮT ĐẦU NGAY bằng Tiêu đề có icon thu hút. TUYỆT ĐỐI KHÔNG thêm lời chào, không thêm câu mở đầu dẫn dắt như "Dưới đây là...", không dùng thẻ HTML.` }],
              }],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              text = text.trim()
                .replace(/^(dưới đây là|sau đây là|chào bạn|đây là bài viết)[^\n]*\n+/i, '')
                .replace(/^---+\s*\n+/m, '')
                .trim();
              console.log(`[Gemini Pro] ✅ ${account.name} (model: ${model}) đã tạo bài thành công!`);
              return text;
            }
          } else {
            console.warn(`[Gemini Pro] ⚠️ ${account.name} (${model}) trả về lỗi ${response.status}. Thử phương án tiếp theo...`);
          }
        } catch (err) {
          console.warn(`[Gemini Pro] ⚠️ Lỗi kết nối với ${account.name} (${model}): ${err.message}.`);
        }
      }
    }

    throw new Error('Tất cả các tài khoản Gemini Pro trong danh sách đều không phản hồi.');
    }

async function sendToTelegram(photoUrl, caption) {
  console.log(`Đang gửi bài viết về Telegram Bot (Chat ID: ${CHAT_ID})...`);

  // 1. Thử gửi dạng ảnh kèm caption
  try {
    const photoEndpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const photoRes = await fetch(photoEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        photo: photoUrl,
        caption: caption.length <= 1000 ? caption : caption.slice(0, 990) + '...',
      }),
    });
    const photoData = await photoRes.json();
    if (photoData.ok) {
      // Nếu bài dài > 1000 ký tự, gửi thêm 1 tin nhắn đầy đủ để trọn vẹn thông tin liên hệ
      if (caption.length > 1000) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: caption,
          }),
        });
      }
      return photoData.result;
    }
    console.warn(`sendPhoto không thành công: ${photoData.description}. Chuyển sang gửi text...`);
  } catch (err) {
    console.warn(`sendPhoto gặp lỗi kết nối: ${err.message}. Chuyển sang gửi text...`);
  }

  // 2. Dự phòng: Gửi tin nhắn text đầy đủ kèm link ảnh
  const msgEndpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const msgRes = await fetch(msgEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `${caption}\n\n🖼️ Ảnh minh họa: ${photoUrl}`,
    }),
  });
  const msgData = await msgRes.json();
  if (!msgData.ok) {
    throw new Error(`Telegram error: ${msgData.description}`);
  }
  return msgData.result;
}

    async function publishDirectToBuffer(imageUrl, caption) {
      console.log('Đang xuất bản trực tiếp lên Fanpage Facebook qua Buffer API...');
      const response = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${BUFFER_TOKEN}`,
        },
        body: JSON.stringify({
          query: `
        mutation PublishNow($input: CreatePostInput!) {
          createPost(input: $input) {
            __typename
            ... on PostActionSuccess {
              post {
                id
                status
                externalLink
                error { message }
              }
            }
            ... on InvalidInputError { message }
            ... on UnauthorizedError { message }
            ... on NotFoundError { message }
            ... on UnexpectedError { message }
            ... on LimitReachedError { message }
          }
        }
      `,
          variables: {
            input: {
              channelId: BUFFER_CHANNEL_ID,
              text: caption,
              assets: [{ image: { url: imageUrl } }],
              mode: 'shareNow',
              schedulingType: 'automatic',
              needsApproval: false,
              saveToDraft: false,
              metadata: { facebook: { type: 'post' } },
            },
          },
        }),
      });

      const data = await response.json();
      const result = data.data?.createPost;
      if (result?.__typename === 'PostActionSuccess') {
        return result.post;
      }
      throw new Error(`Buffer Publish Error: ${JSON.stringify(result || data)}`);
    }

    async function main() {
      const args = process.argv.slice(2);
      let selectedTopic = 'treatment';
      let directPublish = false;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--topic' && args[i + 1]) {
          selectedTopic = args[i + 1].toLowerCase();
        }
        if (args[i] === '--publish') {
          directPublish = true;
        }
      }

      const topicKeys = Object.keys(TOPICS);
      if (selectedTopic === 'random') {
        selectedTopic = topicKeys[Math.floor(Math.random() * topicKeys.length)];
      }

      const config = TOPICS[selectedTopic] || TOPICS.treatment;
      console.log(`=== PETX CMS AI AUTO PUBLISHER ===`);
      console.log(`Chủ đề: ${config.name}`);

      // Kiểm tra danh sách API Keys
      const geminiKeys = loadGeminiKeys();
      console.log(`Tìm thấy: ${geminiKeys.length} tài khoản Gemini Pro sẵn sàng hoạt động.`);

      let caption = config.sampleCaption;
        if (geminiKeys.length > 0) {
          try {
            caption = await generateWithGeminiPool(config.prompt, geminiKeys);
          } catch (err) {
            console.warn('Lỗi gọi Gemini AI, chuyển sang dùng bài viết chuẩn:', err.message);
          }
        } else {
          console.log('Chưa điền key trong gemini-keys.json hoặc .env. Đang dùng nội dung chuẩn hóa sẵn.');
        }

        // Chọn ảnh ngẫu nhiên từ kho ảnh phong phú để không bao giờ trùng lặp
        const selectedImage = pickRandomImage(config.imagePool);
        console.log(`Ảnh được chọn ngẫu nhiên: ${selectedImage}`);

        console.log('\n--- NỘI DUNG BÀI ĐĂNG ---');
        console.log(caption);
        console.log('-------------------------\n');

        // Gửi về Telegram
        await sendToTelegram(selectedImage, caption);
        console.log('✅ Đã gửi bài và ảnh về Telegram Bot!');

        // Nếu có cờ --publish: đăng thẳng lên Facebook
        if (directPublish) {
          const published = await publishDirectToBuffer(selectedImage, caption);
          console.log(`🎉 ĐÃ ĐĂNG LÊN FACEBOOK THÀNH CÔNG!`);
          console.log(`🔗 Link bài viết: ${published.externalLink}`);
        }
      }

      main().catch(error => {
        console.error('❌ Lỗi:', error.message);
        process.exitCode = 1;
      });
