'use client';

import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');

  const analyzeSentiment = async () => {
    console.log("Sending:", text);

    const res = await fetch('/api/sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    console.log("Response:", data);

    setResult(data.sentiment);
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>AI Sentiment Dashboard</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            analyzeSentiment();
          }
        }}
        placeholder="Enter text..."
        rows={4}
        style={{ width: '300px' }}
      />

      <br /><br />

      <button onClick={analyzeSentiment}>
        Analyze
      </button>

      <h2>Result: {result}</h2>
    </div>
  );
}