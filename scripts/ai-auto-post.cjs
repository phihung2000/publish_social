#!/usr/bin/env node
/**
 * AI Auto Post for PetX CMS (https://petx.io.vn/)
 * Tự động tạo Content + Ảnh bằng AI và gửi thẳng qua Telegram Bot để đưa vào hàng đợi đăng bài.
 *
 * Thông tin liên hệ tư vấn & mua phần mềm:
 *   - Hotline / Zalo: 0396 476 443
 *   - Email: nguyenphihung3800@gmail.com
 *   - Website: https://petx.io.vn/
 *
 * Các chủ đề chuẩn khớp mã nguồn PetX CMS:
 *   - treatment: Khám bệnh mới, kê toa & Bệnh án điện tử
 *   - pos: Màn hình bán hàng Pet Shop POS & In hóa đơn
 *   - inventory: Nhập thuốc & Kiểm kê kho hàng, cân bằng thừa/thiếu
 *   - branch: Xuất điều chuyển thuốc giữa các chi nhánh
 *   - doctor: Báo cáo doanh số & Tính hoa hồng theo Bác sĩ thú y
 *   - debt: Quản lý công nợ & Kế toán thu chi dòng tiền
 *   - mobile: Ứng dụng PetX Mobile tiện lợi cho bác sĩ
 */

const fs = require('node:fs');
const path = require('node:path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9289182695:AAHmYnvuwqA8XJW1NyNKcsjOVErKEopbEX0';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || 2125360645;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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
${CONTACT_FOOTER}`,
    sampleImageUrl: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1080&q=80',
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
    sampleImageUrl: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=1080&q=80',
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
    sampleImageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1080&q=80',
  },
  branch: {
    name: 'Xuất chuyển kho giữa các chi nhánh',
    prompt: 'Viết bài quảng cáo tính năng Xuất chuyển hàng sang chi nhánh của PetX CMS (petx.io.vn). Dành cho chuỗi phòng khám thú y có từ 2 chi nhánh trở lên cần điều chuyển thuốc và vắc xin.',
    sampleCaption: `🏢 QUẢN LÝ CHUỖI NHIỀU PHÒNG KHÁM THÚ Y: ĐIỀU CHUYỂN THUỐC DỄ DÀNG, RÕ RÀNG!

Mở thêm chi nhánh 2, chi nhánh 3 nhưng việc chuyển thuốc qua lại giữa các cơ sở ghi chép lộn xộn, dễ thất lạc?

✨ Phân hệ Xuất Sang Chi Nhánh của PetX CMS (https://petx.io.vn/) giải quyết triệt để:
🚚 Lập phiếu xuất chuyển kho nhanh chóng, ghi nhận chi nhánh gửi - chi nhánh nhận.
🚚 Trừ kho chi nhánh xuất và tự động cộng kho chi nhánh nhận ngay khi xác nhận.
🚚 Kiểm soát toàn diện dòng luân chuyển hàng hóa giữa mọi cơ sở trong chuỗi phòng khám.
${CONTACT_FOOTER}`,
    sampleImageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1080&q=80',
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
${CONTACT_FOOTER}`,
    sampleImageUrl: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1080&q=80',
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
    sampleImageUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1080&q=80',
  },
};

async function generateWithGemini(prompt, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const systemInstruction = `Bạn là chuyên gia Content Marketing B2B chuyên về phần mềm quản lý phòng khám thú y PetX CMS (website: https://petx.io.vn/ - Hotline/Zalo: 0396 476 443 - Email: nguyenphihung3800@gmail.com).
LƯU Ý QUAN TRỌNG VỀ TÍNH NĂNG THỰC TẾ CỦA PETX CMS:
- PetX CMS chuyên sâu về: Khám bệnh mới, Kê toa thuốc, Bệnh án điện tử, Khôi phục toa thuốc lỡ xóa, Bán hàng Pet Shop POS, Nhập thuốc, Kiểm kê kho hàng (đối chiếu thừa thiếu), Xuất chuyển kho chi nhánh, Báo cáo doanh số theo Bác sĩ thú y, Quản lý công nợ & thu chi, In mã vạch, và có app PetX Mobile.
- KHÔNG viết về Spa & Grooming vì phần mềm không chuyên mảng này.
- Luôn kèm thông tin liên hệ: Hotline/Zalo: 0396 476 443, Email: nguyenphihung3800@gmail.com, Website: https://petx.io.vn/.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemInstruction}\n\nYêu cầu đề tài: ${prompt}\nHãy viết bài hoàn chỉnh bằng tiếng Việt, có xuống dòng và emoji sinh động.` }],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function sendToTelegram(photoUrl, caption) {
  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  console.log(`Đang gửi ảnh và nội dung về Telegram Bot (Chat ID: ${CHAT_ID})...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      photo: photoUrl,
      caption: caption.slice(0, 1024),
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description}`);
  }

  try {
    const n8nWebhook = 'http://127.0.0.1:5678/webhook/b9b17288-112f-48bf-912e-37113d0af7ac/webhook';
    await fetch(n8nWebhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-telegram-bot-api-secret-token': 'ydB34hz0p26wvGhG_telegram-trigger',
      },
      body: JSON.stringify({
        update_id: Math.floor(Date.now() / 1000),
        message: {
          message_id: result.result.message_id,
          from: { id: Number(CHAT_ID), is_bot: false, first_name: 'PetX Admin' },
          chat: { id: Number(CHAT_ID), type: 'private' },
          date: Math.floor(Date.now() / 1000),
          photo: result.result.photo,
          caption,
        },
      }),
    });
    console.log('Đã đồng bộ bài đăng vào n8n Queue thành công!');
  } catch (webhookErr) {
    console.warn('Lưu ý đồng bộ n8n webhook:', webhookErr.message);
  }

  return result.result;
}

async function main() {
  const args = process.argv.slice(2);
  let selectedTopic = 'treatment';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      selectedTopic = args[i + 1].toLowerCase();
    }
  }

  const topicKeys = Object.keys(TOPICS);
  if (selectedTopic === 'random') {
    selectedTopic = topicKeys[Math.floor(Math.random() * topicKeys.length)];
  }

  const config = TOPICS[selectedTopic] || TOPICS.treatment;
  console.log(`=== PETX CMS AI AUTO PUBLISHER ===`);
  console.log(`Chủ đề: ${config.name}`);

  let caption = config.sampleCaption;
  if (GEMINI_API_KEY) {
    try {
      console.log('Đang gọi Gemini AI để sáng tạo nội dung mới...');
      const generated = await generateWithGemini(config.prompt, GEMINI_API_KEY);
      if (generated) caption = generated;
      console.log('Tạo nội dung AI thành công!');
    } catch (err) {
      console.warn('Lỗi gọi Gemini AI, chuyển sang dùng nội dung tuyển chọn chuẩn:', err.message);
    }
  } else {
    console.log('Chưa cung cấp GEMINI_API_KEY. Sử dụng nội dung chuẩn hóa khớp codebase PetX CMS.');
  }

  console.log('\n--- NỘI DUNG BÀI ĐĂNG ---');
  console.log(caption);
  console.log('-------------------------\n');

  const sentMessage = await sendToTelegram(config.sampleImageUrl, caption);
  console.log(`✅ Đã gửi thành công vào Telegram Bot! (Message ID: ${sentMessage.message_id})`);
  console.log(`🤖 Telegram Webhook đã tự động tiếp nhận và đưa bài vào hàng đợi (/queue) trong n8n.`);
}

main().catch(error => {
  console.error('❌ Lỗi:', error.message);
  process.exitCode = 1;
});
