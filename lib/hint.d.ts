declare class Hint {
    readonly area: number[];
    readonly breadth: number;
    readonly min: number;
    readonly max: number;
    constructor(area: number[], min: number, max?: number);
    equals(another: Hint): boolean;
    clone(): Hint;
    isValid(): boolean;
    partMin(partBreadth: number): number;
    partMax(partBreadth: number): number;
    static areaEqual(area1: number[], area2: number[]): boolean;
    static areaInclude(area1: number[], area2: number[]): boolean;
    static areaCrossing(area1: number[], area2: number[]): boolean;
    static areaCombine(area1: number[], area2: number[]): number[];
    static areaIntersection(area1: number[], area2: number[]): number[] | null;
    static areaDifference(area1: number[], area2: number[]): number[] | null;
    static solve(hint1: Hint, hint2: Hint): {
        newHints: Hint[];
        hint1removable: boolean;
        hint2removable: boolean;
    } | null;
}
export = Hint;
