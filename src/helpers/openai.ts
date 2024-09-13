import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

export async function getCommitMessage(): Promise<string|null> {
    if ( process.env['OPENAI_API_KEY'] ) {        
        const params:  OpenAI.Chat.ChatCompletionCreateParams = {
          messages: [{ role: 'user', content: 'Say this is a test' }],
          model: 'gpt-3.5-turbo',
        };
        const chatCompletion: OpenAI.Chat.ChatCompletion = await client.chat.completions.create(params);
		return chatCompletion.choices[0].message?.content;
    }
	return null;
}



/*
// getCommitMessage();
{
				model,
				messages: [
					{
						role: 'system',
						content: generatePrompt(locale, maxLength, type),
					},
					{
						role: 'user',
						content: diff,
					},
				],
				temperature: 0.7,
				top_p: 1,
				frequency_penalty: 0,
				presence_penalty: 0,
				max_tokens: 200,
				stream: false,
				n: completions,
			},
			timeout,
			proxy
		);
*/