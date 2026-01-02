// api/chat.js - Vercel Serverless Function
const axios = require('axios');

// 主处理函数，Vercel会自动调用
module.exports = async (req, res) => {
  // 1. 设置CORS头，允许你的前端域名访问（生产环境应替换为具体域名）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. 处理预检请求 (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(404).json({ error: 'Not Found. Use POST.' });
  }

  try {
    // 4. 获取用户消息
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // 5. 从环境变量读取密钥 (安全!)
    const COZE_API_TOKEN = process.env.COOZE_API_TOKEN;
    const COZE_PROJECT_ID = '7590667883051499558';

    // 6. 调用扣子API
    const cozeResponse = await axios.post(
      'https://nr7rggmqrg.coze.site/stream_run',
      {
        content: {
          query: {
            prompt: [{ type: 'text', content: { text: message } }]
          }
        },
        type: 'query',
        project_id: COZE_PROJECT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${COZE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    // 7. 处理流式响应
    let fullText = '';
    await new Promise((resolve, reject) => {
      cozeResponse.data.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'answer' && event.content?.answer) {
                fullText += event.content.answer;
              }
            } catch (e) { /* 忽略非JSON行 */ }
          }
        }
      });
      cozeResponse.data.on('end', resolve);
      cozeResponse.data.on('error', reject);
    });

    // 8. 返回结果给前端
    res.status(200).json({ success: true, reply: fullText });

  } catch (error) {
    console.error('代理服务器错误:', error.message);
    res.status(500).json({
      success: false,
      error: 'Request to upstream API failed.',
      detail: error.message
    });
  }
};
