const API_KEY = "";

const state = {
    currentAudioObject: null,
    audioQueue: [],
    sPlaying: false,
}

async function* llmStreaming(userText = '') {
   
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-5.6-luna',
            input:` you are a part of Speech to Text and Text to Speech pipeline.
            Always make sure while streaming to answer in sentences so thats is easier for me to convert them to Speech as soon as sentence competes.
            User Query: ${userText}
            `,
            stream: true,
        }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let textContent = '';
    let sentenceBuffer = '';

    function takeSentences(text) {
    const sentences = [];
    let rest = text;

    while (true) {
        const end = rest.search(/[.?]/);
        if (end === -1) break;
        const sentence = rest.slice(0, end + 1).trim();
        rest = rest.slice(end + 1);
        if (sentence) sentences.push(sentence);
    }
    return { sentences, rest };
  }


    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
            const payload = event
                .split('\n')
                .filter((line) => line.startsWith('data: '))
                .map((line) => line.slice(6))
                .join('\n');

            if (!payload || payload === '[DONE]') continue;
            const parsed = JSON.parse(payload);

            if (parsed.type === 'response.output_text.delta') {
                textContent += parsed.delta;
                sentenceBuffer += parsed.delta;
                const { sentences, rest } = takeSentences(sentenceBuffer);
                sentenceBuffer = rest;
                for (const sentence of sentences) {
                    yield {
                        textContent,
                        isFinal: false,
                        delta: sentence,
                    };
            }
        }

        if (parsed.type === 'response.output_text.done') {
            textContent = parsed.text ?? textContent;

        if (sentenceBuffer.trim()) {
            yield {
                textContent,
                isFinal: true,
                delta: sentenceBuffer.trim(),
                };
                sentenceBuffer = '';
            }
        }
        }
    }
}

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


    // async function bgWorker() {
    //     while(true){
    //          if(state.audioQueue && state.audioQueue.length > 0){
    //         const audioBlob = state.audioQueue.shift()
    //         const audioUrl = URL.createObjectURL(audioBlob);
    //         const audio = new Audio(audioUrl);
    //         await audio.play();
    //         audio.onended = () => {
    //         URL.revokeObjectURL(audioUrl)
    //       }; 
    //     }

    //     }
    // }



    // setInterval(async() => {
    //      if(state.audioQueue && state.audioQueue.length > 0){
    //         const audioBlob = state.audioQueue.shift()
    //         const audioUrl = URL.createObjectURL(audioBlob);
    //         const audio = new Audio(audioUrl);
    //         await audio.play();
    //         audio.onended = () => {
    //         URL.revokeObjectURL(audioUrl)
    //       }; 
    //     }
    // }, 0);


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
        state.audioQueue.push(audioBlob);

        if (state.isPlaying) return;
        state.isPlaying = true;

        try {
        while (state.audioQueue.length > 0) {
            const queuedBlob = state.audioQueue.shift();
       const audioUrl = URL.createObjectURL(queuedBlob);
       const audio = new Audio(audioUrl);
        await new Promise((resolve, reject) => {
            state.currentAudioObject = { audio,audioUrl,resolve, reject,};
            audio.onended = () => {
                if (state.currentAudioObject?.audio === audio) {
                    state.currentAudioObject = null;
                }
                URL.revokeObjectURL(audioUrl);
                resolve();
            };

            audio.onerror = () => {
                if (state.currentAudioObject?.audio === audio) {
                    state.currentAudioObject = null;
                }
                URL.revokeObjectURL(audioUrl);
                reject(
                    audio.error ??
                    new Error('Audio playback failed')
                );
            };
            audio.play().catch(reject);
        });
            }
     } finally {
            state.isPlaying = false;
   }



        // if(state.audioQueue && state.audioQueue.length > 0){
        //     while(state.audioQueue.length > 0) {
        //         const audioBlob = state.audioQueue.shift()
        //         const audioUrl = URL.createObjectURL(audioBlob);
        //         const audio = new Audio(audioUrl);
        //         await audio.play();
        //         audio.onended = () => {
        //         URL.revokeObjectURL(audioUrl)
        //       }; 
                 
        //     }
        // }




        // const audioUrl = URL.createObjectURL(audioBlob);
        // const audio = new Audio(audioUrl);

        // // for managing the state
        // state.currentAudioObject = {
        //     audioUrl,
        //      audio,
        // }
        // await audio.play();
        // audio.onended = () => {
        //     state.currentAudioObject = null;
        //     URL.revokeObjectURL(audioUrl)
        // }        
    };

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


       if(state.currentAudioObject){
    const { audio, audioUrl, resolve } = state.currentAudioObject;

    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = '';
    URL.revokeObjectURL(audioUrl);
    state.currentAudioObject = null;
    resolve?.();
}

if(state.audioQueue.length > 0){
    state.audioQueue = [];
}
             
    
        for await (const chunk of llmStreaming(transcript)) {
            if (!chunk.delta) continue; //add this line
            console.log('Agent chunk:', chunk.delta);
             await speak(chunk.delta);
        }
        
    };
    speechRecognition.start();
}

main()


