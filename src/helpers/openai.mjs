import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

async function getCommitMessage() {
    if ( process.env['OPENAI_API_KEY'] ) {        
        const params = {
          messages: [{ role: 'user', content: 'Say this is a test' }],
          model: 'gpt-3.5-turbo',
        };
        const chatCompletion = await client.chat.completions.create(params);
    }
}

getCommitMessage();


/*
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