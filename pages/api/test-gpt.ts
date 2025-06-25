import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { message, scenario, history = [] } = req.body;

    const messages = [
      {
        role: "system",
        content: `${scenario} 
        Respond naturally as a Canadian would in this situation. 
        Use common Canadian expressions and be friendly. 
        Keep responses concise (under 50 words) and conversational.
        If appropriate, use Canadian terms like 'eh', 'double-double', 'toque', 'loonie', etc.`
      },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 150,
      temperature: 0.8,
    });

    return res.status(200).json({ 
      success: true, 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get response' });
  }
}