// AudioWorklet processor for capturing PCM audio at 16kHz mono
// Converts Float32 samples to Int16 for transmission

class PCMCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // ~128ms at 16kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channel = input[0];

        // Accumulate samples into buffer
        for (let i = 0; i < channel.length; i++) {
            this.buffer[this.bufferIndex++] = channel[i];

            // When buffer is full, send it
            if (this.bufferIndex >= this.bufferSize) {
                this.sendBuffer();
                this.bufferIndex = 0;
            }
        }

        return true;
    }

    sendBuffer() {
        // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
        const int16 = new Int16Array(this.bufferSize);

        for (let i = 0; i < this.bufferSize; i++) {
            // Clamp to [-1, 1] range
            let sample = Math.max(-1, Math.min(1, this.buffer[i]));
            // Convert to Int16
            int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send to main thread
        this.port.postMessage(int16);
    }
}

registerProcessor('pcm-capture', PCMCaptureProcessor);
