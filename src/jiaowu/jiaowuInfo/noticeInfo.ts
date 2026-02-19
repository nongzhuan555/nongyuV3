
/**
 * 清洗教务通知 HTML
 */

export type NoticeItem = {
  title: string;
  url: string;
  date?: string;
};

export type NoticeResult = {
  list: NoticeItem[];
  source: string;
};

// 移除 HTML 标签
function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}

export function cleanNoticeHtml(html: string): NoticeResult {
  return extractNotices(html, '教学通知', {
    searchStrategy: 'keyword',
    limit: 50
  });
}

export function cleanCompetitionHtml(html: string): NoticeResult {
  // 竞赛通知通常有明确的注释标记，或者我们可以搜索 "竞赛通知" 
  // 根据之前的分析，竞赛通知内容前有一个注释：<!---------------------------------------------------------------竞赛通知内容开始------------------------------>
  // 如果找不到注释，尝试搜索 "竞赛通知" 关键字
  return extractNotices(html, '竞赛通知内容开始', {
    searchStrategy: 'comment_or_keyword',
    fallbackKeyword: '竞赛通知',
    limit: 50
  });
}

type ExtractOptions = {
  searchStrategy: 'keyword' | 'comment_or_keyword';
  fallbackKeyword?: string;
  limit?: number;
};

function extractNotices(html: string, keyword: string, options: ExtractOptions): NoticeResult {
  if (!html || typeof html !== 'string') {
    return { list: [], source: 'extractNotices' };
  }

  const list: NoticeItem[] = [];
  const { searchStrategy, fallbackKeyword, limit = 50 } = options;
  
  console.log(`[NoticeInfo] Processing HTML for keyword: ${keyword}`);
  
  let contentToSearch = html;
  let keywordIndex = html.indexOf(keyword);
  
  if (keywordIndex === -1 && searchStrategy === 'comment_or_keyword' && fallbackKeyword) {
     console.log(`[NoticeInfo] Primary keyword "${keyword}" not found, trying fallback "${fallbackKeyword}"`);
     keywordIndex = html.indexOf(fallbackKeyword);
     // 如果是 tab 标题，我们需要跳过一些内容才能到达对应的 UL
     // 简单起见，我们假设内容在标题之后。对于竞赛通知，它在第三个位置。
     // 如果通过标题定位，可能会比较麻烦，因为它们挨在一起。
     // 但是如果有特定注释，就非常准确。
  }

  if (keywordIndex !== -1) {
    console.log(`[NoticeInfo] Found keyword "${keyword}" (or fallback) at index:`, keywordIndex);
    contentToSearch = html.slice(keywordIndex);
  } else {
    console.log(`[NoticeInfo] Keyword "${keyword}" not found, searching entire HTML`);
  }

  // 2. 使用正则表达式匹配列表项
  const itemRegex = /<a\s+href="([^"]+)"\s+title="([^"]*)">([\s\S]*?)<\/a>[\s\S]*?<span>\[(.*?)\]<\/span>/gi;
  
  let match;
  let count = 0;
  
  while ((match = itemRegex.exec(contentToSearch)) !== null) {
    if (count >= limit) break;
    
    let url = match[1];
    let title = match[2] || stripTags(match[3]).trim();
    const date = match[4];
    
    // 如果我们正在处理特定的板块，我们需要确保没有读到下一个板块
    // 简单的启发式方法：如果在两个匹配项之间有大量的 HTML 标签（特别是 ul/div 结束标签），可能已经超出了范围
    // 但正则表达式会自动跳过中间的内容。
    // 一个更好的方法是先找到包含该板块的 <ul>...</ul>，然后只在其中搜索
    // 这里暂时保持简单，依赖 limit 和顺序
    
    // 处理 URL
    if (url && !url.startsWith('http') && !url.startsWith('javascript')) {
      if (url.startsWith('../web/')) {
        url = 'https://jiaowu.sicau.edu.cn/web/web/web/' + url.substring(7);
      } else {
        url = 'https://jiaowu.sicau.edu.cn/web/web/web/' + url;
      }
    }

    if (title && url) {
      list.push({
        title: title.replace(/\s+/g, ' ').trim(),
        url,
        date,
      });
      count++;
    }
  }
  
  console.log(`[NoticeInfo] Extracted ${list.length} notices for ${keyword}`);

  return { list, source: 'extractNotices' };
}
