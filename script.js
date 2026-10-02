

async function main() {
    const SpeechRecognition = window.SpeechRecognition;
    const speechRecognition = new SpeechRecognition();

    
    speechRecognition.continious = true;
    speechRecognition.interimResults = false; //give result when the user stop
    speechRecognition.maxAlternatives = 1;


    speechRecognition.onstart = function() {
        console.log("🎤SpeechRecognition has started");

    };
    
    speechRecognition.onresult = async function (event) {
        
    }

    
}

main()