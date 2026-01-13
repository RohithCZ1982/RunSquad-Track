import React from 'react';
import './StylizedText.css';

function StylizedText({ text = 'RunSquad', size = 'medium', variant = 'dark-bg', className = '' }) {
  const letters = text.split('').map((letter, index) => (
    <span key={index} className="letter">
      {letter}
    </span>
  ));

  // Create shadow layers using data attribute for dynamic text
  const shadowStyle = {
    '--text-content': `"${text}"`
  };

  return (
    <h1 
      className={`stylized-runsquad ${size} ${variant} ${className}`}
      data-text={text}
      style={shadowStyle}
    >
      {letters}
    </h1>
  );
}

export default StylizedText;
