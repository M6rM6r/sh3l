import type { GameType } from '../types';

export interface TutorialStep {
  title: string;
  description: string;
  animation?: 'pattern' | 'cards' | 'dots' | 'stroop' | 'sequence';
}

export const tutorialContent: Record<GameType, {
  name: string;
  description: string;
  steps: TutorialStep[];
  practiceInstructions: string;
}> = {
  memory: {
    name: 'Memory Matrix',
    description: 'Test and improve your spatial memory by remembering patterns.',
    steps: [
      {
        title: 'Watch the Pattern',
        description: 'Tiles will light up in a specific order. Pay close attention!',
        animation: 'pattern'
      },
      {
        title: 'Repeat the Pattern',
        description: 'Click the tiles in the same order they lit up.',
        animation: 'pattern'
      },
      {
        title: 'Level Up',
        description: 'Each round adds more tiles to the pattern. How far can you go?',
        animation: 'pattern'
      }
    ],
    practiceInstructions: 'Watch the pattern, then click the tiles in order.'
  },
  speed: {
    name: 'Speed Match',
    description: 'Test your processing speed by matching shapes quickly.',
    steps: [
      {
        title: 'Compare Shapes',
        description: 'Look at the PREVIOUS card and the CURRENT card.',
        animation: 'cards'
      },
      {
        title: 'Match or No Match?',
        description: 'Do the SHAPES match? (Ignore the colors!)',
        animation: 'cards'
      },
      {
        title: 'Be Quick!',
        description: 'Answer as fast as you can. Speed matters!',
        animation: 'cards'
      }
    ],
    practiceInstructions: 'Click "Match" if shapes are the same, "No Match" if different.'
  },
  attention: {
    name: 'Train of Thought',
    description: 'Sharpen your focus by tracking moving objects.',
    steps: [
      {
        title: 'Target Color',
        description: 'Look at the target color shown at the top.',
        animation: 'dots'
      },
      {
        title: 'Catch the Dots',
        description: 'Click only the dots that match the target color as they fall.',
        animation: 'dots'
      },
      {
        title: 'Avoid Distractions',
        description: 'Don\'t click dots of other colors!',
        animation: 'dots'
      }
    ],
    practiceInstructions: 'Click only the dots matching the target color.'
  },
  flexibility: {
    name: 'Color Match',
    description: 'Test cognitive flexibility with the Stroop effect.',
    steps: [
      {
        title: 'Read the Word',
        description: 'The word shows a color name.',
        animation: 'stroop'
      },
      {
        title: 'Check the Ink',
        description: 'The word is printed in a color. Is it the SAME as the word?',
        animation: 'stroop'
      },
      {
        title: 'Meaning vs. Ink',
        description: 'Does the word\'s MEANING match the INK COLOR?',
        animation: 'stroop'
      }
    ],
    practiceInstructions: 'Answer if the word meaning matches the ink color.'
  },
  problemSolving: {
    name: 'Pattern Recall',
    description: 'Challenge your working memory with sequences.',
    steps: [
      {
        title: 'Watch the Sequence',
        description: 'Buttons will light up in a pattern. Remember the order!',
        animation: 'sequence'
      },
      {
        title: 'Repeat It',
        description: 'Click the buttons in the same order.',
        animation: 'sequence'
      },
      {
        title: 'It Gets Harder',
        description: 'Each level adds one more step to remember.',
        animation: 'sequence'
      }
    ],
    practiceInstructions: 'Watch the sequence, then repeat it by clicking buttons.'
  },
  math: {
    name: 'Chalkboard Challenge',
    description: 'Solve math problems quickly and accurately.',
    steps: [
      {
        title: 'Read the Problem',
        description: 'Look at the equation shown on the chalkboard.',
        animation: 'pattern'
      },
      {
        title: 'Calculate',
        description: 'Solve the math problem in your head.',
        animation: 'pattern'
      },
      {
        title: 'Enter Answer',
        description: 'Type the correct answer and submit.',
        animation: 'pattern'
      }
    ],
    practiceInstructions: 'Solve the math problem and enter your answer.'
  },
  reaction: {
    name: 'Fish Food Frenzy',
    description: 'Catch fish quickly to test your reaction time.',
    steps: [
      {
        title: 'Watch for Fish',
        description: 'Fish will swim up from the bottom of the ocean.',
        animation: 'dots'
      },
      {
        title: 'Click to Catch',
        description: 'Click on fish before they swim away!',
        animation: 'dots'
      },
      {
        title: 'Faster = More Points',
        description: 'Quicker fish are worth more points.',
        animation: 'dots'
      }
    ],
    practiceInstructions: 'Click on the fish as they swim up!'
  },
  word: {
    name: 'Word Bubble',
    description: 'Remember words that appear briefly.',
    steps: [
      {
        title: 'Watch the Word',
        description: 'A word will appear in the bubble. Remember it!',
        animation: 'pattern'
      },
      {
        title: 'Wait',
        description: 'The word will disappear. Hold it in your memory.',
        animation: 'pattern'
      },
      {
        title: 'Type It',
        description: 'Type the word exactly as you saw it.',
        animation: 'pattern'
      }
    ],
    practiceInstructions: 'Remember the word, then type it when the bubble disappears.'
  },
  visual: {
    name: 'Lost in Migration',
    description: 'Find the bird facing a different direction.',
    steps: [
      {
        title: 'Look at the Flock',
        description: 'A group of birds will appear flying together.',
        animation: 'dots'
      },
      {
        title: 'Find the Odd One',
        description: 'One bird is facing a different direction than the others.',
        animation: 'dots'
      },
      {
        title: 'Click It',
        description: 'Quickly click on the bird facing differently!',
        animation: 'dots'
      }
    ],
    practiceInstructions: 'Click the bird facing a DIFFERENT direction!'
  },
  spatial: {
    name: 'Rotation Recall',
    description: 'Remember how shapes are rotated.',
    steps: [
      {
        title: 'Study the Shape',
        description: 'A shape will appear at a specific rotation angle.',
        animation: 'pattern'
      },
      {
        title: 'Remember',
        description: 'The shape will disappear. Remember its rotation!',
        animation: 'pattern'
      },
      {
        title: 'Find the Match',
        description: 'Click the shape with the same rotation angle.',
        animation: 'pattern'
      }
    ],
    practiceInstructions: 'Select the shape with the same rotation you saw.'
  },
  memorySequence: {
    name: 'Memory Sequence',
    description: 'Remember and repeat number sequences.',
    steps: [
      {
        title: 'Watch the Sequence',
        description: 'Numbers will light up in a sequence.',
        animation: 'sequence'
      },
      {
        title: 'Remember',
        description: 'Memorize the order of the numbers.',
        animation: 'sequence'
      },
      {
        title: 'Repeat',
        description: 'Click the numbers in the same order.',
        animation: 'sequence'
      }
    ],
    practiceInstructions: 'Watch the sequence, then repeat it by clicking the numbers.'
  }
};


