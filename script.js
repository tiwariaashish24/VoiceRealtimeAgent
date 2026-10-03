const API_KEY = process.env.OPENAI_API_KEY;






async function llm(userText = '') {
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-5.6-luna',
            // input: `${SYSTEM}: ${userText}`,
            input: userText,
        })
    })
    const data = await response.json();
    const textOutput = data.output
        .flatMap((item) => item.content ?? [])
        .find((content) => content.type === 'output_text');

    return textOutput?.text ?? '';

    }


    async function speak(text = '') {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
        headers: {
            'Content-type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            voice: 'coral',
            input: text,
            instructions: 'Speak in a cheerful, warm and natural tone '
        }),
        });
        const audioBlob = await response.blob();

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl)


        
    }



    


async function main() {
    const SpeechRecognition = window.SpeechRecognition;
    const speechRecognition = new SpeechRecognition();


    speechRecognition.continuous = true;
    speechRecognition.interimResults = false; //give result when the user stop
    speechRecognition.maxAlternatives = 1;


    speechRecognition.onstart = function() {
        console.log("🎤SpeechRecognition has started");

    };
    
    speechRecognition.onresult = async function (event) {
        const transcript = event.results[event.results.length -1][0].transcript;
        console.log('User:', transcript);
        const textResponse = await llm(transcript);
        console.log(`Agent: ${textResponse}`);
        await speak(textResponse);


        
    };
    speechRecognition.start();

    
}

main()


