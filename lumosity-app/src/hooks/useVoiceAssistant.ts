import { useState, useEffect, useRef } from 'react';

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface VoiceCommand {
  command: string;
  action: () => void;
}

interface UseVoiceAssistantOptions {
  commands: VoiceCommand[];
  continuous?: boolean;
  lang?: string;
}

export const useVoiceAssistant = ({ commands, continuous = false, lang = 'en-US' }: UseVoiceAssistantOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const win = window as WindowWithSpeechRecognition;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        if (recognition) {
          recognition.continuous = continuous;
          recognition.interimResults = true;
          recognition.lang = lang;

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            setTranscript(finalTranscript);

            // Process commands
            if (finalTranscript) {
              const matchedCommand = commands.find(cmd =>
                finalTranscript.toLowerCase().includes(cmd.command.toLowerCase())
              );
              if (matchedCommand) {
                matchedCommand.action();
              }
            }
          };

          recognition.onerror = () => {
            // Silent error handling
            setIsListening(false);
          };
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [commands, continuous, lang]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening
  };
};