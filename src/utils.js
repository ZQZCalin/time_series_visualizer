// Util functions

const EMA = (arr, alpha = 0) => {
    /* Computes EMA of form 
        ema[i] = alpha*ema[i-1] + (1-alpha)*arr[i].
    */
    const output = new Array(arr.length).fill(0);
    for (let i = 0; i < arr.length; i++) {
        if (i === 0) {
            output[i] = (1-alpha) * arr[i]; // Initialize the first element
        } else {
            output[i] = alpha * output[i - 1] + (1 - alpha) * arr[i];
        }
    }
    // Debias EMA.
    return output.map((val, i) => val / (1 - alpha ** (i + 1)));
}

export { EMA };