#!/usr/bin/env node
/**
 * Auto Scheduler for PetX CMS Social Posting
 * Tự động chạy theo lịch hẹn giờ trên Windows / macOS / Linux.
 * 
 * Cách dùng:
 *   node scripts/auto-scheduler.cjs
 *   node scripts/auto-scheduler.cjs --every-hours 4
 *   node scripts/auto-scheduler.cjs --times 09:00,14:00,20:00
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const TOPICS = ['treatment', 'pos', 'inventory', 'transfer', 'doctor', 'mobile'];
let currentTopicIndex = 0;

// Các mốc giờ đăng bài mặc định trong ngày (Giờ:Phút)
const DEFAULT_SCHEDULE_TIMES = ['09:00', '14:00', '20:00'];

const args = process.argv.slice(2);
let scheduleTimes = DEFAULT_SCHEDULE_TIMES;
let intervalHours = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--times' && args[i + 1]) {
    scheduleTimes = args[i + 1].split(',').map(t => t.trim());
    i++;
  } else if (args[i] === '--every-hours' && args[i + 1]) {
    intervalHours = parseFloat(args[i + 1]);
    i++;
  }
}

function runPostNow(topic) {
  const chosenTopic = topic || TOPICS[currentTopicIndex % TOPICS.length];
  currentTopicIndex++;

  const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`\n======================================================`);
  console.log(`[${nowStr}] 🚀 BẮT ĐẦU TỰ ĐỘNG ĐĂNG BÀI: Chủ đề [${chosenTopic}]`);
  console.log(`======================================================`);

  const scriptPath = path.resolve(__dirname, 'ai-auto-post.cjs');
  const child = spawn(process.execPath, [scriptPath, '--topic', chosenTopic, '--publish'], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    console.log(`[Auto Scheduler] ✅ Hoàn thành tác vụ (Mã thoát: ${code})\n`);
  });
}

function startScheduler() {
  console.log(`======================================================`);
  console.log(`   PETX CMS - HỆ THỐNG TỰ ĐỘNG ĐĂNG BÀI (WINDOWS / MAC)`);
  console.log(`======================================================`);

  if (intervalHours) {
    console.log(`⏱️ Chế độ: Đăng định kỳ mỗi ${intervalHours} giờ.`);
    console.log(`👉 Chạy bài đầu tiên ngay bây giờ...`);
    runPostNow();
    setInterval(() => {
      runPostNow();
    }, intervalHours * 3600 * 1000);
  } else {
    console.log(`📅 Chế độ: Đăng bài theo các khung giờ vàng hàng ngày: ${scheduleTimes.join(', ')}`);
    console.log(`⏳ Đang chạy nền và theo dõi đồng hồ hệ thống... (Nhấn Ctrl + C để dừng)`);

    let lastTriggeredMinute = '';

    setInterval(() => {
      const now = new Date();
      // Định dạng HH:MM theo giờ Việt Nam
      const timeStr = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      if (scheduleTimes.includes(timeStr) && lastTriggeredMinute !== timeStr) {
        lastTriggeredMinute = timeStr;
        runPostNow();
      }
    }, 20000); // Kiểm tra mỗi 20 giây
  }
}

startScheduler();

