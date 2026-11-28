import { getImageUrl } from './imageUrl.js';

function wrapLines(ctx, text, maxWidth, maxLines = 6) {
  if (!text) return [];
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderAnnouncementToPng(announcement) {
  const width = 1600;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const theme = announcement?.template_data?.theme || {};
  const isEmergency = announcement?.priority === 'emergency' || announcement?.template_id === 'emergency_banner';
  const bg = theme.bg_color || (isEmergency ? '#7a0a16' : '#101827');
  const fg = theme.text_color || '#f8fafc';
  const accent = theme.accent_color || (isEmergency ? '#facc15' : '#c9f23a');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 16);

  // Scope / category pill
  const college = announcement?.target_college;
  const scopeLabel = !college || college === 'ALL' || college === 'Campus-Wide'
    ? 'CAMPUS-WIDE ANNOUNCEMENT'
    : `${String(college).toUpperCase()} ANNOUNCEMENT`;

  ctx.font = 'bold 26px "Space Grotesk", Arial, sans-serif';
  const pillW = ctx.measureText(scopeLabel).width + 52;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(96, 86, pillW, 52, 26);
  ctx.fill();

  ctx.fillStyle = '#101827';
  ctx.fillText(scopeLabel, 122, 121);

  // Title
  const hasPhoto = Boolean(announcement?.image_urls?.[0] || announcement?.image_url);
  const textMaxW = hasPhoto ? 860 : width - 192;

  ctx.fillStyle = fg;
  ctx.font = 'bold 64px "Space Grotesk", Arial, sans-serif';
  const titleLines = wrapLines(ctx, announcement?.title || 'Campus Announcement', textMaxW, 3);
  let y = 220;
  for (const line of titleLines) {
    ctx.fillText(line, 96, y);
    y += 78;
  }

  // Body
  if (announcement?.body) {
    y += 18;
    ctx.font = '500 32px "DM Sans", Arial, sans-serif';
    ctx.globalAlpha = 0.9;
    const bodyLines = wrapLines(ctx, announcement.body, textMaxW, 6);
    for (const line of bodyLines) {
      ctx.fillText(line, 96, y);
      y += 46;
    }
    ctx.globalAlpha = 1;
  }

  // Template metadata
  const data = announcement?.template_data || {};
  const metaParts = [];
  if (data.event_date) metaParts.push(`Date: ${data.event_date}`);
  if (data.event_time) metaParts.push(`Time: ${data.event_time}`);
  if (data.venue) metaParts.push(`Venue: ${data.venue}`);
  if (data.deadline_date) metaParts.push(`Deadline: ${data.deadline_date}`);
  if (data.recipient) metaParts.push(`Recipient: ${data.recipient}`);

  if (metaParts.length > 0) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 28px "DM Sans", Arial, sans-serif';
    ctx.fillText(metaParts.slice(0, 3).join('   •   '), 96, height - 120);
  }

  // Optional right-side photo
  const rawPhoto = announcement?.image_urls?.[0] || announcement?.image_url;
  if (rawPhoto) {
    try {
      const src = rawPhoto.startsWith('blob:') || rawPhoto.startsWith('data:') ? rawPhoto : getImageUrl(rawPhoto);
      const img = await loadImage(src);
      const boxX = 1010;
      const boxY = 120;
      const boxW = 500;
      const boxH = 660;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH);
    } catch {
      // Ignore image load failures in canvas fallback
    }
  }

  // Footer
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.55;
  ctx.font = '600 22px "Space Grotesk", Arial, sans-serif';
  ctx.fillText('PASKIL • CAMPUS DIGITAL BULLETIN BOARD', 96, height - 54);
  ctx.globalAlpha = 1;

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  return { blob, dataUrl };
}

export async function getAnnouncementImageBlob(announcement) {
  const rawPhoto = announcement?.image_urls?.[0] || announcement?.image_url;
  if (rawPhoto) {
    try {
      const src = rawPhoto.startsWith('blob:') || rawPhoto.startsWith('data:') ? rawPhoto : getImageUrl(rawPhoto);
      const img = await loadImage(src);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 1200;
      canvas.height = img.naturalHeight || img.height || 800;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
      const dataUrl = canvas.toDataURL('image/png');
      if (blob) return { blob, dataUrl };
    } catch {
      // Fall back to template render
    }
  }
  return renderAnnouncementToPng(announcement);
}
