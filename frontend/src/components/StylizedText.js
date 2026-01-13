import React from 'react';
import './StylizedText.css';

function StylizedText({ text = 'RunSquad', size = 'medium', variant = 'dark-bg', className = '' }) {
  // Split "RunSquad" into "Run", shoe symbol, and "Squad"
  let displayContent;
  if (text === 'RunSquad') {
    const runLetters = 'Run'.split('').map((letter, index) => (
      <span 
        key={`run-${index}`} 
        className={`letter ${index === 2 ? 'last-before-shoe' : ''}`}
      >
        {letter}
      </span>
    ));
    const squadLetters = 'Squad'.split('').map((letter, index) => (
      <span 
        key={`squad-${index}`} 
        className={`letter ${index === 4 ? 'last-letter' : ''}`}
      >
        {letter}
      </span>
    ));
    
    displayContent = (
      <>
        {runLetters}
        <span className="shoe-symbol">👟</span>
        {squadLetters}
      </>
    );
  } else {
    displayContent = text.split('').map((letter, index) => (
      <span 
        key={index} 
        className={`letter ${index === text.length - 1 ? 'last-letter' : ''}`}
      >
        {letter}
      </span>
    ));
  }

  // Create shadow layers using data attribute for dynamic text
  // For "RunSquad", add wider space in shadow to match shoe symbol width
  // Using em space (U+2003) for better alignment
  const shadowText = text === 'RunSquad' ? 'Run\u2003Squad' : text;
  const shadowStyle = {
    '--text-content': `"${shadowText}"`
  };

  return (
    <h1 
      className={`stylized-runsquad ${size} ${variant} ${className}`}
      data-text={shadowText}
      style={shadowStyle}
    >
      {displayContent}
    </h1>
  );
}

export default StylizedText;
