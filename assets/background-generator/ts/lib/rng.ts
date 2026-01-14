export class RNG {
    private state: number;

    constructor(seed: number = Date.now()) {
        this.state = seed >>> 0;
    }

    next(): number {
        // Mulberry32
        this.state += 0x6d2b79f5;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    float(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }

    int(min: number, max: number): number {
        return Math.floor(this.float(min, max + 1));
    }

    choice<T>(values: ReadonlyArray<T>): T {
        if (!values.length) {
            throw new Error("choice() called with empty array");
        }
        return values[this.int(0, values.length - 1)];
    }
}
