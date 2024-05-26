import './App.css';
import Chart from './Chart';
import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState([]);
  useEffect(() => {
    setData([
      {
          timestamp: "2024-05-01T00:00:00Z",
          price: 100
      },
      {
          timestamp: "2024-05-02T00:00:00Z",
          price: 105
      },
      {
          timestamp: "2024-05-03T00:00:00Z",
          price: 102
      },
      {
          timestamp: "2024-05-04T00:00:00Z",
          price: 108
      },
      {
          timestamp: "2024-05-05T00:00:00Z",
          price: 110
      },
      {
          timestamp: "2024-05-06T00:00:00Z",
          price: 108
      },
      {
          timestamp: "2024-05-07T00:00:00Z",
          price: 99
      },
      {
          timestamp: "2024-05-08T00:00:00Z",
          price: 115
      },
    ]);
  }, []);

  return (
    <div className="App">
      <Chart data={data} referencePoint={105} />
    </div>
  );
}

export default App;
