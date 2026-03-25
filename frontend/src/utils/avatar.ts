// 颜色列表，用于生成头像背景色
const colors = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#EF4444', // red
  '#14B8A6', // teal
  '#F97316', // orange
];

// 根据字符串生成哈希值
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// 根据群组名称获取背景色
export function getAvatarColor(name: string): string {
  const hash = hashString(name);
  return colors[hash % colors.length];
}

// 获取群组名称的缩略文字（最多4个字）
export function getAvatarText(name: string): string {
  if (!name) return '?';
  
  // 移除空白字符
  const cleanName = name.trim();
  
  // 提取中文字符或单词首字母
  let result = '';
  
  // 检查是否包含中文
  const hasChinese = /[\u4e00-\u9fa5]/.test(cleanName);
  
  if (hasChinese) {
    // 中文：取前4个字
    result = cleanName.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 4);
  } else {
    // 英文：取每个单词的首字母，最多4个
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    result = words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
  }
  
  return result || '?';
}
