declare class Analyzer {
    private _hints;
    private _valid;
    private _probabilityMap;
    private _removedHints;
    private _coveredArea;
    isValid(): boolean;
    clone(): Analyzer;
    add(area: number[], min: number, max?: number): boolean;
    addR(area_from: number, area_to: number, min: number, max?: number): boolean;
    private _addHint;
    private _classifyHints;
    private _calculateProbabilityMap;
    getProbabilityMap(minesNumber: number): {
        [x: number]: number;
    } | null;
    getPatternsNumber(minesNumber: number): number;
}
export = Analyzer;
