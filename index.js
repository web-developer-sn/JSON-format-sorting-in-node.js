const express = require('express');
const bodyParser = require('body-parser');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const app = express();
const port = 8000;

app.use(bodyParser.json());

// sorting a sub-array
const sortSubArray = (subArray) => {
  return subArray.sort((a, b) => a - b);
};

// sorting an array of sub-arrays
const sortArrays = (arrays) => {
  return arrays.map(subArray => sortSubArray(subArray));
};

app.get('/',(req,res)=>{
  res.send("<h1>hello world</h1>")
})

//  sequential processing
app.post('/process-single', (req, res) => {
  const { to_sort } = req.body;

  if (!to_sort || !Array.isArray(to_sort)) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const sortedArrays = sortArrays(to_sort);

  res.json({ sorted_arrays: sortedArrays, time_ns: process.hrtime()[1] });
});

//  worker threads
const processConcurrent = (arrays, callback) => {
  const worker = new Worker(__filename, {
    workerData: { arrays }
  });

  worker.on('message', (sortedArray) => {
    callback(sortedArray);
  });
};

//  concurrent processing
app.post('/process-concurrent', (req, res) => {
  const arrays = req.body.to_sort || [];

  if (!Array.isArray(arrays)) {
    return res.status(400).json({ error: 'Input must be an array.' });
  }

  processConcurrent(arrays, (sortedArray) => {
    res.json({ sorted_arrays: sortedArray, time_ns: process.hrtime()[1] });
  });
});

//  logic for concurrent processing
if (!isMainThread) {
  const { arrays } = workerData;
  const sortedArrays = sortArrays(arrays);
  parentPort.postMessage(sortedArrays);
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
